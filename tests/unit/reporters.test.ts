import { describe, it, expect, vi } from "vitest";
import { formatReviewResultJson } from "../../src/reporters/json.js";
import { renderConsoleReport } from "../../src/reporters/console.js";
import { formatReviewSummaryMarkdown, SUMMARY_MARKER } from "../../src/reporters/markdown.js";
import type { ReviewResult } from "../../src/types/index.js";

describe("Reporters (Console, JSON, Markdown)", () => {
  const sampleResult: ReviewResult = {
    summary: "Overall review completed with 2 findings.",
    findings: [
      {
        id: "f1",
        file: "src/auth.ts",
        line: 10,
        severity: "critical",
        category: "security",
        title: "Hardcoded secret",
        description: "Insecure default secret key.",
        suggestion: "Use process.env.SECRET",
        confidence: 0.98,
        ruleId: "no-hardcoded-secrets",
      },
      {
        id: "f2",
        file: "src/api.ts",
        line: 25,
        severity: "medium",
        category: "bug",
        title: "Unhandled error",
        description: "Missing catch block.",
        confidence: 0.85,
      },
    ],
    reviewedFiles: ["src/auth.ts", "src/api.ts"],
    skippedFiles: ["assets/logo.png (Binary file)"],
    provider: "openai",
    model: "gpt-4o",
    durationMs: 1200,
    status: "failed",
    blockingFindings: [
      {
        id: "f1",
        file: "src/auth.ts",
        line: 10,
        severity: "critical",
        category: "security",
        title: "Hardcoded secret",
        description: "Insecure default secret key.",
        confidence: 0.98,
      },
    ],
    usage: {
      inputTokens: 1000,
      outputTokens: 300,
      estimatedCost: 0.0055,
    },
  };

  it("formats review result as valid JSON string", () => {
    const jsonStr = formatReviewResultJson(sampleResult);
    const parsed = JSON.parse(jsonStr);
    expect(parsed.provider).toBe("openai");
    expect(parsed.findings.length).toBe(2);
    expect(parsed.status).toBe("failed");
  });

  it("renders console report without errors", () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    renderConsoleReport(sampleResult);
    expect(logSpy).toHaveBeenCalled();
    logSpy.mockRestore();
  });

  it("formats Markdown summary with table, blocking findings, and details", () => {
    const md = formatReviewSummaryMarkdown(sampleResult, {
      unmappedFindings: [
        {
          id: "u1",
          file: "src/legacy.ts",
          line: 50,
          severity: "low",
          category: "style",
          title: "Deprecated method",
          description: "Method is deprecated.",
          confidence: 0.8,
        },
      ],
    });

    expect(md).toContain(SUMMARY_MARKER);
    expect(md).toContain("## 🤖 AI Code Review Summary");
    expect(md).toContain("Files Analyzed | 2");
    expect(md).toContain("Hardcoded secret");
    expect(md).toContain("Merge-Blocking Issues (1)");
    expect(md).toContain("File-Level / Diff-External Findings (1)");
  });
});
