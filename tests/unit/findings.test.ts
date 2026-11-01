import { describe, it, expect } from "vitest";
import {
  parseAndValidateAIResponse,
  deduplicateFindings,
  processAndFilterFindings,
  validateFindingsAgainstDiff,
} from "../../src/core/findings.js";
import type { ChangedFile, ReviewFinding } from "../../src/types/index.js";

describe("Findings Parsing, Validation & Deduplication", () => {
  it("parses valid JSON response from AI provider", () => {
    const rawResponse = JSON.stringify({
      summary: "Review identified critical security issues.",
      findings: [
        {
          id: "sec-1",
          file: "src/auth.ts",
          line: 14,
          severity: "critical",
          category: "security",
          title: "Hardcoded default fallback secret",
          description: "Using default insecure secret creates authentication bypass.",
          suggestion: "throw new Error('JWT_SECRET must be configured')",
          confidence: 0.98,
        },
      ],
    });

    const result = parseAndValidateAIResponse(rawResponse, ["src/auth.ts"]);
    expect(result.findings.length).toBe(1);
    expect(result.findings[0]?.severity).toBe("critical");
    expect(result.findings[0]?.line).toBe(14);
    expect(result.parseErrors.length).toBe(0);
  });

  it("extracts JSON wrapped in markdown code fences", () => {
    const rawResponse =
      "Here is your review:\n```json\n" +
      JSON.stringify({
        summary: "Code looks good overall with one warning.",
        findings: [
          {
            file: "src/api.ts",
            line: 42,
            severity: "medium",
            category: "bug",
            title: "Unhandled error",
            description: "Promise rejection is not handled.",
            confidence: 0.82,
          },
        ],
      }) +
      "\n```\nHope this helps!";

    const result = parseAndValidateAIResponse(rawResponse, ["src/api.ts"]);
    expect(result.findings.length).toBe(1);
    expect(result.findings[0]?.file).toBe("src/api.ts");
    expect(result.findings[0]?.severity).toBe("medium");
  });

  it("deduplicates identical findings on the same file and line", () => {
    const findings: ReviewFinding[] = [
      {
        id: "f1",
        file: "src/db.ts",
        line: 20,
        severity: "high",
        category: "security",
        title: "SQL Injection",
        description: "Unsanitized user input concatenated to query",
        confidence: 0.9,
      },
      {
        id: "f2",
        file: "src/db.ts",
        line: 20,
        severity: "high",
        category: "security",
        title: "SQL Injection",
        description: "Unsanitized input in SQL query",
        confidence: 0.85,
      },
    ];

    const deduplicated = deduplicateFindings(findings);
    expect(deduplicated.length).toBe(1);
  });

  it("preserves critical and high severity findings even if confidence score is low", () => {
    const findings: ReviewFinding[] = [
      {
        id: "f1",
        file: "src/auth.ts",
        line: 5,
        severity: "critical", // Critical severity!
        category: "security",
        title: "Potential RCE vulnerability",
        description: "Dangerous deserialization",
        confidence: 0.4, // Below 0.75 threshold
      },
      {
        id: "f2",
        file: "src/style.ts",
        line: 12,
        severity: "low", // Low severity
        category: "style",
        title: "Minor spacing issue",
        description: "Extra whitespace",
        confidence: 0.5, // Below 0.75 threshold
      },
    ];

    const filtered = processAndFilterFindings(findings, {
      minimumConfidence: 0.75,
      maxComments: 10,
      noiseReduction: true,
    });

    // The critical finding must be preserved despite confidence 0.4!
    expect(filtered.some((f) => f.id === "f1")).toBe(true);
    // The low finding must be filtered out
    expect(filtered.some((f) => f.id === "f2")).toBe(false);
  });

  it("validates findings against diff hunks and separates unmapped findings", () => {
    const mockFile: ChangedFile = {
      filename: "src/payments.ts",
      status: "modified",
      additions: 5,
      deletions: 0,
      patch: "@@ -10,5 +10,5 @@",
      hunks: [
        {
          oldStart: 10,
          oldLines: 5,
          newStart: 10,
          newLines: 5,
          lines: [],
        },
      ],
      addedLineNumbers: [11, 12, 13],
      modifiedLineNumbers: [11, 12, 13],
      isBinary: false,
    };

    const filesMap = new Map<string, ChangedFile>([["src/payments.ts", mockFile]]);

    const findings: ReviewFinding[] = [
      {
        id: "f1",
        file: "src/payments.ts",
        line: 12, // Inside diff hunk [10, 15]
        severity: "high",
        category: "bug",
        title: "Race condition",
        description: "Concurrent balance update",
        confidence: 0.9,
      },
      {
        id: "f2",
        file: "src/payments.ts",
        line: 99, // Outside diff hunk
        severity: "medium",
        category: "maintainability",
        title: "Legacy function",
        description: "Function is deprecated",
        confidence: 0.8,
      },
      {
        id: "f3",
        file: "src/non-existent.ts", // Hallucinated file
        line: 1,
        severity: "low",
        category: "style",
        title: "Missing comment",
        description: "Add docstring",
        confidence: 0.8,
      },
    ];

    const { validFindings, invalidOrUnmapped } = validateFindingsAgainstDiff(findings, filesMap);

    expect(validFindings.map((f) => f.id)).toEqual(["f1"]);
    expect(invalidOrUnmapped.map((f) => f.id)).toEqual(["f2", "f3"]);
  });
});
