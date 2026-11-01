import { describe, it, expect, vi } from "vitest";
import { createReviewer, Reviewer } from "../../src/core/reviewer.js";
import type { ChangedFile, ReviewResult } from "../../src/types/index.js";

describe("Reviewer Public Class & createReviewer", () => {
  it("initializes with default options", () => {
    const reviewer = createReviewer();
    expect(reviewer).toBeInstanceOf(Reviewer);
    expect(reviewer.config.ai.provider).toBe("openai");
    expect(reviewer.config.review.strictness).toBe("standard");
  });

  it("applies constructor overrides correctly", () => {
    const reviewer = createReviewer({
      provider: "gemini",
      model: "gemini-2.5-flash",
      strictness: "maximum",
      quiet: true,
      debug: false,
    });

    expect(reviewer.config.ai.provider).toBe("gemini");
    expect(reviewer.config.ai.model).toBe("gemini-2.5-flash");
    expect(reviewer.config.review.strictness).toBe("maximum");
  });

  it("reviews provided changed files successfully", async () => {
    const reviewer = createReviewer();

    const mockResult: ReviewResult = {
      summary: "Review completed.",
      findings: [],
      reviewedFiles: ["src/app.ts"],
      skippedFiles: [],
      provider: "openai",
      model: "gpt-4o",
      durationMs: 100,
      status: "passed",
      blockingFindings: [],
    };

    // Spy on internal orchestrator
    vi.spyOn(
      (reviewer as unknown as { orchestrator: { runReview: () => Promise<unknown> } }).orchestrator,
      "runReview"
    ).mockResolvedValue({
      result: mockResult,
      changedFilesMap: new Map(),
    });

    const files: ChangedFile[] = [
      {
        filename: "src/app.ts",
        status: "modified",
        additions: 1,
        deletions: 0,
        patch: "@@ -1,1 +1,2 @@\n+ console.log('ok');",
        hunks: [],
        addedLineNumbers: [2],
        modifiedLineNumbers: [2],
        isBinary: false,
      },
    ];

    const result = await reviewer.reviewFiles(files);
    expect(result.status).toBe("passed");
    expect(result.reviewedFiles).toEqual(["src/app.ts"]);
  });

  it("dispatches review options to corresponding methods", async () => {
    const reviewer = createReviewer();

    const mockWorkingTree = vi.spyOn(reviewer, "reviewWorkingTree").mockResolvedValue({
      summary: "wt",
      findings: [],
      reviewedFiles: [],
      skippedFiles: [],
      provider: "openai",
      model: "gpt-4o",
      durationMs: 50,
      status: "passed",
      blockingFindings: [],
    });

    const mockStaged = vi.spyOn(reviewer, "reviewStaged").mockResolvedValue({
      summary: "staged",
      findings: [],
      reviewedFiles: [],
      skippedFiles: [],
      provider: "openai",
      model: "gpt-4o",
      durationMs: 50,
      status: "passed",
      blockingFindings: [],
    });

    const mockBranch = vi.spyOn(reviewer, "reviewBranch").mockResolvedValue({
      summary: "branch",
      findings: [],
      reviewedFiles: [],
      skippedFiles: [],
      provider: "openai",
      model: "gpt-4o",
      durationMs: 50,
      status: "passed",
      blockingFindings: [],
    });

    await reviewer.review();
    expect(mockWorkingTree).toHaveBeenCalled();

    await reviewer.review({ staged: true });
    expect(mockStaged).toHaveBeenCalled();

    await reviewer.review({ base: "main", head: "HEAD" });
    expect(mockBranch).toHaveBeenCalledWith("main", "HEAD");
  });
});
