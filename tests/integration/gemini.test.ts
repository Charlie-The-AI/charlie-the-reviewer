import { describe, it, expect, vi } from "vitest";
import { GeminiProvider } from "../../src/providers/gemini.js";
import type { AIReviewRequest } from "../../src/types/index.js";

// Mock the @google/genai package
vi.mock("@google/genai", () => {
  return {
    GoogleGenAI: class MockGoogleGenAI {
      models = {
        generateContent: vi.fn().mockImplementation(async () => {
          return {
            text: JSON.stringify({
              summary: "Gemini mock review detected an unhandled promise rejection.",
              findings: [
                {
                  id: "gemini-bug-1",
                  file: "src/fetcher.ts",
                  line: 22,
                  severity: "high",
                  category: "bug",
                  title: "Unhandled async promise rejection",
                  description: "fetch call missing catch block.",
                  suggestion: "wrap in try/catch or await",
                  confidence: 0.92,
                },
              ],
            }),
            usageMetadata: {
              promptTokenCount: 420,
              candidatesTokenCount: 95,
            },
          };
        }),
      };
    },
  };
});

describe("Google Gemini Provider Integration", () => {
  it("executes review, parses structured findings, and tracks token usage", async () => {
    const provider = new GeminiProvider({
      model: "gemini-2.5-flash",
      apiKey: "AIzaSyD-mock-gemini-key-for-tests-123456",
    });

    const request: AIReviewRequest = {
      files: [
        {
          filename: "src/fetcher.ts",
          status: "modified",
          patch: "@@ -20,5 +20,5 @@\n+ fetch(url).then(res => res.json());",
          strictness: "standard",
          applicableRules: [],
        },
      ],
      defaultStrictness: "standard",
      customRules: [],
    };

    const response = await provider.review(request);

    expect(response.summary).toContain("unhandled promise");
    expect(response.findings.length).toBe(1);
    expect(response.findings[0]?.severity).toBe("high");
    expect(response.findings[0]?.line).toBe(22);
    expect(response.usage?.inputTokens).toBe(420);
    expect(response.usage?.outputTokens).toBe(95);
  });

  it("throws error when Gemini API key is missing", async () => {
    delete process.env.GEMINI_API_KEY;
    const provider = new GeminiProvider({
      model: "gemini-2.5-flash",
      apiKey: "",
    });

    const request: AIReviewRequest = {
      files: [],
      defaultStrictness: "standard",
      customRules: [],
    };

    await expect(provider.review(request)).rejects.toThrow("Google Gemini API key is missing");
  });
});
