import { describe, it, expect } from "vitest";
import { parseUnifiedDiff } from "../../src/git/parser.js";
import { filterAndPrepareDiff, batchReviewFiles } from "../../src/git/diff.js";

const SAMPLE_DIFF = `diff --git a/src/auth.ts b/src/auth.ts
index 1234567..89abcdef 100644
--- a/src/auth.ts
+++ b/src/auth.ts
@@ -10,6 +10,8 @@ export function authenticate(token: string) {
   if (!token) {
     throw new Error("Missing token");
   }
+  const secret = process.env.JWT_SECRET || "default_insecure_secret";
+  return verify(token, secret);
 }
diff --git a/src/assets/logo.png b/src/assets/logo.png
new file mode 100644
index 0000000..1234567
Binary files /dev/null and b/src/assets/logo.png differ
diff --git a/deleted-old.ts b/deleted-old.ts
deleted file mode 100644
index 89abcdef..0000000
--- a/deleted-old.ts
+++ /dev/null
@@ -1,5 +0,0 @@
-export const OLD = true;
`;

describe("Git Diff Parser & Filtering", () => {
  it("accurately parses unified diff into ChangedFile structures", () => {
    const files = parseUnifiedDiff(SAMPLE_DIFF);
    expect(files.length).toBe(3);

    // File 1: src/auth.ts
    const authFile = files[0]!;
    expect(authFile.filename).toBe("src/auth.ts");
    expect(authFile.status).toBe("modified");
    expect(authFile.additions).toBe(2);
    expect(authFile.isBinary).toBe(false);
    expect(authFile.addedLineNumbers).toEqual([13, 14]);
    expect(authFile.hunks.length).toBe(1);
    expect(authFile.hunks[0]?.newStart).toBe(10);

    // File 2: Binary file
    const binaryFile = files[1]!;
    expect(binaryFile.filename).toBe("src/assets/logo.png");
    expect(binaryFile.isBinary).toBe(true);

    // File 3: Deleted file
    const deletedFile = files[2]!;
    expect(deletedFile.filename).toBe("deleted-old.ts");
    expect(deletedFile.status).toBe("deleted");
  });

  it("filters out binary files, deleted files, and ignored patterns", () => {
    const files = parseUnifiedDiff(SAMPLE_DIFF);
    const result = filterAndPrepareDiff(files, {
      ignorePatterns: ["**/*.png"],
      maxFiles: 10,
      maxDiffLines: 1000,
      defaultStrictness: "standard",
    });

    expect(result.reviewableFiles.length).toBe(1);
    expect(result.reviewableFiles[0]?.filename).toBe("src/auth.ts");

    expect(result.skippedFiles.length).toBe(2);
    expect(result.skippedFiles.some((s) => s.filename.includes("logo.png"))).toBe(true);
    expect(result.skippedFiles.some((s) => s.filename.includes("deleted-old.ts"))).toBe(true);
  });

  it("chunks batches when total tokens exceed max input tokens", () => {
    const mockFiles = Array.from({ length: 10 }, (_, i) => ({
      filename: `file_${i}.ts`,
      status: "modified" as const,
      patch: "line1\nline2\n".repeat(500), // ~6000 chars each ~= 1500 tokens
      strictness: "standard" as const,
      applicableRules: [],
    }));

    const batches = batchReviewFiles(mockFiles, 3500);
    expect(batches.length).toBeGreaterThan(1);
    const totalFiles = batches.reduce((acc, b) => acc + b.length, 0);
    expect(totalFiles).toBe(10);
  });

  it("truncates patches that exceed max_diff_lines limit", () => {
    const hugePatch = Array.from({ length: 50 }, (_, i) => `+ line ${i}`).join("\n");
    const diff = `diff --git a/huge.ts b/huge.ts\n--- a/huge.ts\n+++ b/huge.ts\n@@ -1,1 +1,50 @@\n${hugePatch}`;
    const files = parseUnifiedDiff(diff);

    const result = filterAndPrepareDiff(files, {
      ignorePatterns: [],
      maxFiles: 10,
      maxDiffLines: 20, // limit to 20 lines
      defaultStrictness: "standard",
    });

    expect(result.reviewableFiles[0]?.patch).toContain(
      "[Diff truncated: exceeded max_diff_lines limit"
    );
  });
});
