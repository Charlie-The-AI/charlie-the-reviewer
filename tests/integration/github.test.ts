import { describe, it, expect, vi } from "vitest";
import { GitHubClient } from "../../src/integrations/github/client.js";
import {
  fetchPullRequestFiles,
  fetchPullRequestMetadata,
} from "../../src/integrations/github/pull-request.js";
import { GitHubReporter } from "../../src/reporters/github.js";
import type { ChangedFile, ReviewResult } from "../../src/types/index.js";

// Mock Octokit
vi.mock("octokit", () => {
  return {
    Octokit: class MockOctokit {
      rest = {
        pulls: {
          get: vi.fn().mockResolvedValue({
            data: {
              number: 42,
              title: "feat: add payment gateway",
              body: "Implements Stripe checkout",
              base: { ref: "main" },
              head: { ref: "feature/stripe", sha: "abc123commitsha" },
              user: { login: "octocat" },
            },
          }),
          listFiles: vi.fn(),
          listReviewComments: vi.fn().mockResolvedValue({ data: [] }),
          createReviewComment: vi.fn().mockResolvedValue({ data: { id: 101 } }),
        },
        issues: {
          listComments: vi.fn().mockResolvedValue({ data: [] }),
          createComment: vi.fn().mockResolvedValue({ data: { id: 202 } }),
          updateComment: vi.fn().mockResolvedValue({ data: { id: 202 } }),
        },
        checks: {
          create: vi.fn().mockResolvedValue({ data: { id: 303 } }),
        },
      };

      paginate = vi.fn().mockImplementation(async (method: unknown) => {
        if (method === this.rest.pulls.listFiles) {
          return [
            {
              filename: "src/stripe.ts",
              status: "modified",
              additions: 15,
              deletions: 2,
              patch: "@@ -10,10 +10,15 @@\n+ export function pay() { return true; }",
            },
          ];
        }
        if (method === this.rest.issues.listComments) {
          return [];
        }
        if (method === this.rest.pulls.listReviewComments) {
          return [];
        }
        return [];
      });
    },
  };
});

describe("GitHub Integration", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      GITHUB_TOKEN: "ghp_mocktoken1234567890abcdef12345678",
      GITHUB_REPOSITORY: "thesonofman/ai-code-reviewer",
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("fetches PR metadata and list of changed files with pagination", async () => {
    const client = new GitHubClient();
    expect(client.owner).toBe("thesonofman");
    expect(client.repo).toBe("ai-code-reviewer");

    const meta = await fetchPullRequestMetadata(client, 42);
    expect(meta.number).toBe(42);
    expect(meta.title).toBe("feat: add payment gateway");
    expect(meta.headSha).toBe("abc123commitsha");

    const files = await fetchPullRequestFiles(client, 42);
    expect(files.length).toBe(1);
    expect(files[0]?.filename).toBe("src/stripe.ts");
    expect(files[0]?.additions).toBe(15);
  });

  it("publishes PR summary, inline comments, and check run via GitHubReporter", async () => {
    const reporter = new GitHubReporter({
      pullNumber: 42,
      commitSha: "abc123commitsha",
      repository: "thesonofman/ai-code-reviewer",
    });

    const mockResult: ReviewResult = {
      summary: "PR review looks good with 1 minor suggestion.",
      findings: [
        {
          id: "finding-1",
          file: "src/stripe.ts",
          line: 12,
          severity: "high",
          category: "security",
          title: "Missing idempotency key in Stripe charge",
          description: "Stripe payments must include idempotency key to prevent double charge.",
          suggestion: "stripe.charges.create(params, { idempotencyKey })",
          confidence: 0.95,
        },
      ],
      reviewedFiles: ["src/stripe.ts"],
      skippedFiles: [],
      provider: "openai",
      model: "gpt-4o",
      durationMs: 1500,
      status: "failed",
      blockingFindings: [
        {
          id: "finding-1",
          file: "src/stripe.ts",
          line: 12,
          severity: "high",
          category: "security",
          title: "Missing idempotency key in Stripe charge",
          description: "Stripe payments must include idempotency key to prevent double charge.",
          confidence: 0.95,
        },
      ],
    };

    const changedFilesMap = new Map<string, ChangedFile>([
      [
        "src/stripe.ts",
        {
          filename: "src/stripe.ts",
          status: "modified",
          additions: 10,
          deletions: 0,
          patch: "@@ -10,10 +10,15 @@",
          hunks: [
            {
              oldStart: 10,
              oldLines: 10,
              newStart: 10,
              newLines: 15,
              lines: [],
            },
          ],
          addedLineNumbers: [11, 12, 13],
          modifiedLineNumbers: [11, 12, 13],
          isBinary: false,
        },
      ],
    ]);

    const reportOutput = await reporter.report(mockResult, changedFilesMap);

    expect(reportOutput.summaryCommentId).toBe(202);
    expect(reportOutput.inlineCommentsPosted).toBe(1);
    expect(reportOutput.checkRunId).toBe(303);
  });
});
