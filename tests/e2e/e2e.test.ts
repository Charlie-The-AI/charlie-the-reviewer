import { describe, it, expect } from "vitest";
import { ReviewOrchestrator } from "../../src/core/orchestrator.js";
import { DEFAULT_CONFIG } from "../../src/config/defaults.js";
import type { ChangedFile, AIProvider, AIReviewResponse } from "../../src/types/index.js";
import { ProviderRegistry } from "../../src/providers/registry.js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("End-to-End Code Review Engine", () => {
  it("orchestrates full review on multi-language pull request files with path overrides", async () => {
    const tsCode = readFileSync(
      resolve(process.cwd(), "tests/fixtures/typescript-bug.ts"),
      "utf-8"
    );
    const authCode = readFileSync(resolve(process.cwd(), "tests/fixtures/auth-vuln.ts"), "utf-8");
    const paymentCode = readFileSync(
      resolve(process.cwd(), "tests/fixtures/payment-race.ts"),
      "utf-8"
    );
    const injectionCode = readFileSync(
      resolve(process.cwd(), "tests/fixtures/prompt-injection.ts"),
      "utf-8"
    );

    const changedFiles: ChangedFile[] = [
      {
        filename: "src/utils/user.ts",
        status: "modified",
        additions: 10,
        deletions: 0,
        patch: `@@ -1,10 +1,10 @@\n${tsCode
          .split("\n")
          .map((l) => `+ ${l}`)
          .join("\n")}`,
        hunks: [{ oldStart: 1, oldLines: 10, newStart: 1, newLines: 10, lines: [] }],
        addedLineNumbers: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
        modifiedLineNumbers: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
        isBinary: false,
      },
      {
        filename: "src/auth/jwt.ts",
        status: "modified",
        additions: 12,
        deletions: 0,
        patch: `@@ -1,12 +1,12 @@\n${authCode
          .split("\n")
          .map((l) => `+ ${l}`)
          .join("\n")}`,
        hunks: [{ oldStart: 1, oldLines: 12, newStart: 1, newLines: 12, lines: [] }],
        addedLineNumbers: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
        modifiedLineNumbers: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
        isBinary: false,
      },
      {
        filename: "src/payments/wallet.ts",
        status: "modified",
        additions: 15,
        deletions: 0,
        patch: `@@ -1,15 +1,15 @@\n${paymentCode
          .split("\n")
          .map((l) => `+ ${l}`)
          .join("\n")}`,
        hunks: [{ oldStart: 1, oldLines: 15, newStart: 1, newLines: 15, lines: [] }],
        addedLineNumbers: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
        modifiedLineNumbers: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
        isBinary: false,
      },
      {
        filename: "src/billing/discount.ts",
        status: "modified",
        additions: 14,
        deletions: 0,
        patch: `@@ -1,14 +1,14 @@\n${injectionCode
          .split("\n")
          .map((l) => `+ ${l}`)
          .join("\n")}`,
        hunks: [{ oldStart: 1, oldLines: 14, newStart: 1, newLines: 14, lines: [] }],
        addedLineNumbers: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14],
        modifiedLineNumbers: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14],
        isBinary: false,
      },
    ];

    // Mock AI Provider simulating realistic comprehensive review
    class MockE2EAIProvider implements AIProvider {
      readonly name = "mock-e2e";

      async review(): Promise<AIReviewResponse> {
        return {
          summary:
            "E2E automated code review detected critical vulnerabilities and prompt injection attempts.",
          findings: [
            {
              id: "sec-jwt-bypass",
              file: "src/auth/jwt.ts",
              line: 8,
              severity: "critical",
              category: "security",
              title: "Unverified JWT signature verification bypass",
              description: "Using jwt.decode() instead of jwt.verify() allows signature forgery.",
              suggestion: "jwt.verify(token, secretKey)",
              confidence: 0.99,
            },
            {
              id: "race-condition-wallet",
              file: "src/payments/wallet.ts",
              line: 7,
              severity: "critical",
              category: "concurrency",
              title: "Balance check race condition",
              description: "Deduction without atomic lock allows double spending.",
              suggestion: "Wrap balance update in a SERIALIZABLE database transaction.",
              confidence: 0.95,
              ruleId: "transaction-integrity",
            },
            {
              id: "prompt-injection-detected",
              file: "src/billing/discount.ts",
              line: 4,
              severity: "high",
              category: "security",
              title: "Prompt injection attempt detected in code comments",
              description: "Code comment attempts to override reviewer instructions.",
              confidence: 0.98,
            },
            {
              id: "ts-null-crash",
              file: "src/utils/user.ts",
              line: 9,
              severity: "high",
              category: "bug",
              title: "Unsafe non-null assertion on optional metadata",
              description:
                "user.metadata!.permissions will throw TypeError if user.metadata is undefined.",
              suggestion: "user.metadata?.permissions?.includes('admin') ?? false",
              confidence: 0.92,
            },
          ],
          usage: {
            inputTokens: 1250,
            outputTokens: 480,
          },
        };
      }

      async validateConfiguration(): Promise<void> {}
    }

    ProviderRegistry.registerProvider("mock-e2e", MockE2EAIProvider);

    const config = {
      ...DEFAULT_CONFIG,
      ai: {
        ...DEFAULT_CONFIG.ai,
        provider: "mock-e2e",
        model: "mock-e2e-model",
      },
      review: {
        ...DEFAULT_CONFIG.review,
        strictness: "standard" as const,
        fail_on: ["critical", "high"] as Array<"critical" | "high">,
        overrides: [
          {
            paths: ["src/auth/**", "src/payments/**"],
            strictness: "maximum" as const,
          },
        ],
        custom_rules: [
          {
            id: "transaction-integrity",
            description: "Financial operations must preserve transactional consistency",
            severity: "critical" as const,
            paths: ["src/payments/**"],
            enabled: true,
          },
        ],
      },
    };

    const orchestrator = new ReviewOrchestrator({ config });
    const { result } = await orchestrator.runReview({ changedFiles });

    // Verify outcomes
    expect(result.status).toBe("failed");
    expect(result.blockingFindings.length).toBe(4);
    expect(result.reviewedFiles).toEqual([
      "src/utils/user.ts",
      "src/auth/jwt.ts",
      "src/payments/wallet.ts",
      "src/billing/discount.ts",
    ]);

    // Check specific critical findings
    const jwtFinding = result.findings.find((f) => f.id === "sec-jwt-bypass");
    expect(jwtFinding?.severity).toBe("critical");
    expect(jwtFinding?.file).toBe("src/auth/jwt.ts");

    const injectionFinding = result.findings.find((f) => f.id === "prompt-injection-detected");
    expect(injectionFinding?.severity).toBe("high");

    const raceFinding = result.findings.find((f) => f.id === "race-condition-wallet");
    expect(raceFinding?.ruleId).toBe("transaction-integrity");

    // Token usage and cost estimation
    expect(result.usage?.inputTokens).toBe(1250);
    expect(result.usage?.outputTokens).toBe(480);
    expect(result.usage?.estimatedCost).toBeGreaterThan(0);
  });
});
