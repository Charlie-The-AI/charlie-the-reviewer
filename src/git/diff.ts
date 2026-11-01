import micromatch from "micromatch";
import type {
  ChangedFile,
  ChangedFileReviewPayload,
  CustomRule,
  StrictnessLevel,
  StrictnessOverride,
} from "../types/index.js";
import { resolveFileStrictness } from "../core/strictness.js";

export interface DiffFilterOptions {
  ignorePatterns: string[];
  maxFiles: number;
  maxDiffLines: number;
  defaultStrictness: StrictnessLevel;
  overrides?: StrictnessOverride[];
  customRules?: CustomRule[];
}

export interface DiffFilterResult {
  reviewableFiles: ChangedFileReviewPayload[];
  skippedFiles: Array<{ filename: string; reason: string }>;
  changedFilesMap: Map<string, ChangedFile>;
}

export function filterAndPrepareDiff(
  changedFiles: ChangedFile[],
  options: DiffFilterOptions
): DiffFilterResult {
  const reviewableFiles: ChangedFileReviewPayload[] = [];
  const skippedFiles: Array<{ filename: string; reason: string }> = [];
  const changedFilesMap = new Map<string, ChangedFile>();

  let filesIncluded = 0;

  for (const file of changedFiles) {
    changedFilesMap.set(file.filename, file);

    // 1. Skip binary files
    if (file.isBinary) {
      skippedFiles.push({ filename: file.filename, reason: "Binary file" });
      continue;
    }

    // 2. Skip deleted files (nothing in new version to comment on)
    if (file.status === "deleted") {
      skippedFiles.push({ filename: file.filename, reason: "File deleted" });
      continue;
    }

    // 3. Skip empty patches
    if (!file.patch || file.patch.trim().length === 0) {
      skippedFiles.push({ filename: file.filename, reason: "No patch diff available" });
      continue;
    }

    // 4. Check ignore patterns
    const normalizedPath = file.filename.replace(/\\/g, "/");
    const isIgnored = micromatch.isMatch(normalizedPath, options.ignorePatterns, {
      dot: true,
    });
    if (isIgnored) {
      skippedFiles.push({ filename: file.filename, reason: "Matches ignore pattern" });
      continue;
    }

    // 5. Check max files limit
    if (filesIncluded >= options.maxFiles) {
      skippedFiles.push({
        filename: file.filename,
        reason: `Exceeded max_files limit (${options.maxFiles})`,
      });
      continue;
    }

    // Resolve file strictness
    const strictness = resolveFileStrictness(
      file.filename,
      options.defaultStrictness,
      options.overrides
    );

    // Resolve applicable custom rules
    const applicableRules = (options.customRules || []).filter((rule) => {
      if (rule.enabled === false) return false;
      if (!rule.paths || rule.paths.length === 0) return true;
      return micromatch.isMatch(normalizedPath, rule.paths, {
        dot: true,
      });
    });

    // Chunk or truncate patch if it exceeds max_diff_lines
    let patch = file.patch;
    const patchLines = patch.split("\n");
    if (patchLines.length > options.maxDiffLines) {
      patch =
        patchLines.slice(0, options.maxDiffLines).join("\n") +
        `\n\n[Diff truncated: exceeded max_diff_lines limit of ${options.maxDiffLines}]`;
      file.isTruncated = true;
    }

    reviewableFiles.push({
      filename: file.filename,
      status: file.status,
      patch,
      strictness,
      applicableRules,
    });

    filesIncluded++;
  }

  return {
    reviewableFiles,
    skippedFiles,
    changedFilesMap,
  };
}

/**
 * Split review payloads into batches to avoid exceeding token and request limits.
 */
export function batchReviewFiles(
  files: ChangedFileReviewPayload[],
  maxTokensPerBatch: number = 30000
): ChangedFileReviewPayload[][] {
  const batches: ChangedFileReviewPayload[][] = [];
  let currentBatch: ChangedFileReviewPayload[] = [];
  let currentBatchTokens = 0;

  for (const file of files) {
    // Approx 4 chars per token
    const fileTokens = Math.ceil(file.patch.length / 3.8);

    if (currentBatch.length > 0 && currentBatchTokens + fileTokens > maxTokensPerBatch) {
      batches.push(currentBatch);
      currentBatch = [file];
      currentBatchTokens = fileTokens;
    } else {
      currentBatch.push(file);
      currentBatchTokens += fileTokens;
    }
  }

  if (currentBatch.length > 0) {
    batches.push(currentBatch);
  }

  return batches;
}
