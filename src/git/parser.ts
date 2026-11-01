import type { ChangedFile, DiffHunk, DiffLine } from "../types/index.js";

/**
 * Parses unified diff output into structured ChangedFile objects.
 */
export function parseUnifiedDiff(rawDiff: string): ChangedFile[] {
  if (!rawDiff || typeof rawDiff !== "string") {
    return [];
  }

  const files: ChangedFile[] = [];
  const lines = rawDiff.split(/\r?\n/);
  let currentFile: Partial<ChangedFile> | null = null;
  let currentHunk: DiffHunk | null = null;
  let oldLineCursor = 0;
  let newLineCursor = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;

    if (line.startsWith("diff --git ")) {
      // Finalize previous hunk and file
      if (currentHunk && currentFile) {
        currentFile.hunks!.push(currentHunk);
        currentHunk = null;
      }
      if (currentFile && currentFile.filename) {
        files.push(finalizeChangedFile(currentFile));
      }

      // Parse diff --git a/path b/path
      const parts = line.substring(11).split(" ");
      let filename = "";
      if (parts.length >= 2) {
        filename = parts[1]!.replace(/^[ab]\//, "");
      } else {
        filename = line.substring(11).replace(/^[ab]\//, "");
      }

      currentFile = {
        filename,
        status: "modified",
        additions: 0,
        deletions: 0,
        patch: "",
        hunks: [],
        addedLineNumbers: [],
        modifiedLineNumbers: [],
        isBinary: false,
      };
      continue;
    }

    if (!currentFile) {
      continue;
    }

    // Keep raw patch line
    if (currentFile.patch !== undefined) {
      currentFile.patch += (currentFile.patch ? "\n" : "") + line;
    }

    if (line.startsWith("new file mode ")) {
      currentFile.status = "added";
      continue;
    }

    if (line.startsWith("deleted file mode ")) {
      currentFile.status = "deleted";
      continue;
    }

    if (line.startsWith("rename from ")) {
      currentFile.oldFilename = line.substring(12).trim();
      currentFile.status = "renamed";
      continue;
    }

    if (line.startsWith("rename to ")) {
      currentFile.filename = line.substring(10).trim();
      currentFile.status = "renamed";
      continue;
    }

    if (line.startsWith("Binary files ") || line.includes("GIT binary patch")) {
      currentFile.isBinary = true;
      continue;
    }

    if (line.startsWith("--- ")) {
      continue;
    }

    if (line.startsWith("+++ ")) {
      const target = line
        .substring(4)
        .trim()
        .replace(/^[ab]\//, "");
      if (target !== "/dev/null" && target) {
        currentFile.filename = target;
      }
      continue;
    }

    // Parse hunk header: @@ -oldStart,oldLines +newStart,newLines @@
    if (line.startsWith("@@ ")) {
      if (currentHunk) {
        currentFile.hunks!.push(currentHunk);
      }

      const match = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/.exec(line);
      if (match) {
        const oldStart = parseInt(match[1]!, 10);
        const oldLines = match[2] !== undefined ? parseInt(match[2]!, 10) : 1;
        const newStart = parseInt(match[3]!, 10);
        const newLines = match[4] !== undefined ? parseInt(match[4]!, 10) : 1;

        oldLineCursor = oldStart;
        newLineCursor = newStart;

        currentHunk = {
          oldStart,
          oldLines,
          newStart,
          newLines,
          lines: [],
        };
      }
      continue;
    }

    // Inside a hunk
    if (currentHunk) {
      if (line.startsWith("+")) {
        const diffLine: DiffLine = {
          type: "add",
          newLineNumber: newLineCursor,
          content: line.substring(1),
        };
        currentHunk.lines.push(diffLine);
        currentFile.addedLineNumbers!.push(newLineCursor);
        currentFile.additions!++;
        newLineCursor++;
      } else if (line.startsWith("-")) {
        const diffLine: DiffLine = {
          type: "del",
          oldLineNumber: oldLineCursor,
          content: line.substring(1),
        };
        currentHunk.lines.push(diffLine);
        currentFile.deletions!++;
        oldLineCursor++;
      } else if (line.startsWith(" ") || line === "") {
        const diffLine: DiffLine = {
          type: "normal",
          oldLineNumber: oldLineCursor,
          newLineNumber: newLineCursor,
          content: line.startsWith(" ") ? line.substring(1) : line,
        };
        currentHunk.lines.push(diffLine);
        oldLineCursor++;
        newLineCursor++;
      }
    }
  }

  // Push final hunk and file
  if (currentHunk && currentFile) {
    currentFile.hunks!.push(currentHunk);
  }
  if (currentFile && currentFile.filename) {
    files.push(finalizeChangedFile(currentFile));
  }

  return files;
}

function finalizeChangedFile(f: Partial<ChangedFile>): ChangedFile {
  const modifiedLineNumbers = Array.from(new Set(f.addedLineNumbers || []));
  return {
    filename: f.filename || "unknown",
    oldFilename: f.oldFilename,
    status: f.status || "modified",
    additions: f.additions || 0,
    deletions: f.deletions || 0,
    patch: f.patch || "",
    hunks: f.hunks || [],
    addedLineNumbers: f.addedLineNumbers || [],
    modifiedLineNumbers,
    isBinary: Boolean(f.isBinary),
    isTruncated: Boolean(f.isTruncated),
  };
}
