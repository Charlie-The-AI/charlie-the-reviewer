import { z } from "zod";
import type { ChangedFile, ReviewFinding } from "../types/index.js";
import { compareSeverity, SEVERITY_ORDER } from "./severity.js";
import { SeveritySchema } from "../config/schema.js";

export const RawFindingSchema = z.object({
  id: z.string().optional(),
  file: z.string().min(1, "File path must not be empty"),
  line: z.number().int().min(1, "Line number must be a positive integer"),
  endLine: z.number().int().positive().optional(),
  severity: SeveritySchema,
  category: z.string().min(1).default("general"),
  title: z.string().min(1, "Finding title must not be empty"),
  description: z.string().min(1, "Finding description must not be empty"),
  suggestion: z.string().optional(),
  confidence: z.number().min(0).max(1).default(0.8),
  ruleId: z.string().optional(),
});

export const RawAIReviewOutputSchema = z.object({
  summary: z.string().min(1).default("Code review completed."),
  findings: z.array(RawFindingSchema).default([]),
});

export function parseAndValidateAIResponse(
  rawText: string,
  reviewedFilePaths: string[]
): {
  summary: string;
  findings: ReviewFinding[];
  parseErrors: string[];
} {
  const parseErrors: string[] = [];
  let parsedJson: unknown;

  // Try extracting JSON if wrapped in markdown code blocks
  let textToParse = rawText.trim();
  const jsonBlockRegex = /```(?:json)?\s*([\s\S]*?)\s*```/i;
  const match = jsonBlockRegex.exec(textToParse);
  if (match && match[1]) {
    textToParse = match[1].trim();
  }

  try {
    parsedJson = JSON.parse(textToParse);
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    parseErrors.push(`Failed to parse AI JSON response: ${errorMsg}`);
    return {
      summary: "AI review failed to produce valid JSON output.",
      findings: [],
      parseErrors,
    };
  }

  const result = RawAIReviewOutputSchema.safeParse(parsedJson);
  if (!result.success) {
    for (const issue of result.error.issues) {
      parseErrors.push(`Schema validation issue at [${issue.path.join(".")}]: ${issue.message}`);
    }
    // Attempt graceful extraction of valid findings array if present
    if (
      typeof parsedJson === "object" &&
      parsedJson !== null &&
      Array.isArray((parsedJson as Record<string, unknown>).findings)
    ) {
      const validFindings: ReviewFinding[] = [];
      const rawArray = (parsedJson as Record<string, unknown>).findings as unknown[];
      for (const item of rawArray) {
        const itemResult = RawFindingSchema.safeParse(item);
        if (itemResult.success) {
          validFindings.push(normalizeFinding(itemResult.data, reviewedFilePaths));
        }
      }
      return {
        summary:
          typeof (parsedJson as Record<string, unknown>).summary === "string"
            ? ((parsedJson as Record<string, unknown>).summary as string)
            : "Review completed with partial schema validation issues.",
        findings: validFindings,
        parseErrors,
      };
    }

    return {
      summary: "AI response did not conform to the expected review schema.",
      findings: [],
      parseErrors,
    };
  }

  const normalized = result.data.findings.map((f) => normalizeFinding(f, reviewedFilePaths));

  return {
    summary: result.data.summary,
    findings: normalized,
    parseErrors,
  };
}

function normalizeFinding(
  raw: z.infer<typeof RawFindingSchema>,
  reviewedFilePaths: string[]
): ReviewFinding {
  // Normalize file path separators
  let normalizedPath = raw.file.replace(/\\/g, "/").replace(/^\.\//, "");

  // Match against reviewed files if path mismatch occurred (e.g. prefix discrepancy)
  const matched = reviewedFilePaths.find(
    (rf) => rf === normalizedPath || rf.endsWith(normalizedPath) || normalizedPath.endsWith(rf)
  );
  if (matched) {
    normalizedPath = matched;
  }

  const generatedId =
    raw.id ||
    `finding-${normalizedPath.replace(/[^a-zA-Z0-9]/g, "-")}-${raw.line}-${Date.now().toString(36)}`;

  return {
    id: generatedId,
    file: normalizedPath,
    line: Math.max(1, raw.line),
    endLine: raw.endLine ? Math.max(raw.line, raw.endLine) : undefined,
    severity: raw.severity,
    category: raw.category,
    title: raw.title.trim(),
    description: raw.description.trim(),
    suggestion: raw.suggestion?.trim(),
    confidence: Number(raw.confidence.toFixed(2)),
    ruleId: raw.ruleId,
  };
}

/**
 * Validates findings against diff lines. If a line is outside the changed lines of a file,
 * it returns whether it's valid, or maps to a valid position.
 */
export function validateFindingsAgainstDiff(
  findings: ReviewFinding[],
  changedFilesMap: Map<string, ChangedFile>
): {
  validFindings: ReviewFinding[];
  invalidOrUnmapped: ReviewFinding[];
} {
  const validFindings: ReviewFinding[] = [];
  const invalidOrUnmapped: ReviewFinding[] = [];

  for (const finding of findings) {
    const file = changedFilesMap.get(finding.file);
    if (!file) {
      // File was not part of the reviewed set (fabricated / hallucinated file)
      invalidOrUnmapped.push(finding);
      continue;
    }

    // Check if the finding's line number falls within any diff hunk
    const isLineInHunk = file.hunks.some((hunk) => {
      const hunkStart = hunk.newStart;
      const hunkEnd = hunk.newStart + Math.max(hunk.newLines, 1);
      return finding.line >= hunkStart && finding.line <= hunkEnd;
    });

    if (
      isLineInHunk ||
      file.addedLineNumbers.includes(finding.line) ||
      file.modifiedLineNumbers.includes(finding.line)
    ) {
      validFindings.push(finding);
    } else {
      // Line is not in the diff hunks, store as unmapped/summary-only
      invalidOrUnmapped.push(finding);
    }
  }

  return { validFindings, invalidOrUnmapped };
}

/**
 * Deduplicate findings reporting the same problem on the same file and line.
 */
export function deduplicateFindings(findings: ReviewFinding[]): ReviewFinding[] {
  const seen = new Set<string>();
  const unique: ReviewFinding[] = [];

  for (const f of findings) {
    // Generate deduplication fingerprint
    const key = `${f.file}:${f.line}:${f.severity}:${f.title.toLowerCase().trim()}`;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(f);
    }
  }

  return unique;
}

/**
 * Filter and sort findings based on confidence, max comments limit, and noise reduction.
 */
export function processAndFilterFindings(
  findings: ReviewFinding[],
  options: {
    minimumConfidence: number;
    maxComments: number;
    noiseReduction: boolean;
  }
): ReviewFinding[] {
  let processed = options.noiseReduction ? deduplicateFindings(findings) : [...findings];

  // Filter based on confidence
  // RULE: Do not suppress clear, severe security issues solely because of confidence score!
  processed = processed.filter((f) => {
    if (SEVERITY_ORDER[f.severity] >= SEVERITY_ORDER["high"]) {
      // Always keep critical and high severity issues
      return true;
    }
    return f.confidence >= options.minimumConfidence;
  });

  // Sort by severity descending, then file, then line
  processed.sort((a, b) => {
    const sevDiff = compareSeverity(a.severity, b.severity);
    if (sevDiff !== 0) return sevDiff;
    const fileDiff = a.file.localeCompare(b.file);
    if (fileDiff !== 0) return fileDiff;
    return a.line - b.line;
  });

  // Enforce max comments limit
  if (options.maxComments > 0 && processed.length > options.maxComments) {
    processed = processed.slice(0, options.maxComments);
  }

  return processed;
}
