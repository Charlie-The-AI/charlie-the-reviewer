import { describe, it, expect, vi } from "vitest";
import { OpenAIProvider } from "../../src/providers/openai.js";
import type { AIReviewRequest } from "../../src/types/index.js";

// Mock the openai package
vi.mock("openai", () => {
  return {
    default: class MockOpenAI {
      chat = {
        completions: {
          create: vi.fn().mockImplementation(async () => {
            return {
              choices: [
                {
                  message: {
                    content: JSON.stringify({
                      summary: "OpenAI mock review detected a SQL injection bug.",
                      findings: [
                        {
                          id: "openai-bug-1",
                          file: "src/user.ts",
                          line: 15,
                          severity: "critical",
                          category: "security",
                          title: "SQL Injection in query builder",
                          description: "Direct string concatenation into raw SQL.",
                          suggestion: "Use parameterized query db.query(sql, [id])",
                          confidence: 0.96,
                        },
                      ],
                    }),
                  },
                },
              ],
              usage: {
                prompt_tokens: 350,
                completion_tokens: 120,
              },
            };
          }),
        },
      };
    },
  };
});

describe("OpenAI Provider Integration", () => {
  it("executes review, parses structured findings, and tracks token usage", async () => {
    const provider = new OpenAIProvider({
      model: "gpt-4o",
      apiKey: "sk-mock-key-for-unit-tests",
    });

    const request: AIReviewRequest = {
      files: [
        {
          filename: "src/user.ts",
          status: "modified",
          patch: "@@ -10,10 +10,10 @@\n+ const sql = `SELECT * FROM users WHERE id = ${id}`;",
          strictness: "standard",
          applicableRules: [],
        },
      ],
      defaultStrictness: "standard",
      customRules: [],
    };

    const response = await provider.review(request);

    expect(response.summary).toContain("SQL injection");
    expect(response.findings.length).toBe(1);
    expect(response.findings[0]?.severity).toBe("critical");
    expect(response.findings[0]?.line).toBe(15);
    expect(response.usage?.inputTokens).toBe(350);
    expect(response.usage?.outputTokens).toBe(120);
  });

  it("throws error when API key is missing", async () => {
    delete process.env.OPENAI_API_KEY;
    const provider = new OpenAIProvider({
      model: "gpt-4o",
      apiKey: "",
    });

    const request: AIReviewRequest = {
      files: [],
      defaultStrictness: "standard",
      customRules: [],
    };

    await expect(provider.review(request)).rejects.toThrow("OpenAI API key is missing");
  });
});
