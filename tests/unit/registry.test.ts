import { describe, it, expect, vi } from "vitest";
import { ProviderRegistry, executeReviewWithFallback } from "../../src/providers/registry.js";
import type { AIProvider, AIReviewRequest, AIReviewResponse } from "../../src/types/index.js";

describe("Provider Registry & Fallback Execution", () => {
  it("creates registered providers by name", () => {
    const openai = ProviderRegistry.createProvider("openai", {
      model: "gpt-4o",
      apiKey: "test-key",
    });
    expect(openai.name).toBe("openai");

    const gemini = ProviderRegistry.createProvider("gemini", {
      model: "gemini-2.5-flash",
      apiKey: "test-key",
    });
    expect(gemini.name).toBe("gemini");
  });

  it("throws helpful error on unsupported provider name", () => {
    expect(() =>
      ProviderRegistry.createProvider("unsupported_ai", {
        model: "model-x",
      })
    ).toThrow(/Unsupported AI provider "unsupported_ai"/);
  });

  it("allows registering custom extension providers", () => {
    class CustomClaudeProvider implements AIProvider {
      readonly name = "claude";
      async review(): Promise<AIReviewResponse> {
        return { summary: "Claude review", findings: [] };
      }
      async validateConfiguration(): Promise<void> {}
    }

    ProviderRegistry.registerProvider("claude", CustomClaudeProvider);
    expect(ProviderRegistry.getRegisteredProviders()).toContain("claude");

    const custom = ProviderRegistry.createProvider("claude", { model: "claude-3-7-sonnet" });
    expect(custom.name).toBe("claude");
  });

  it("executes primary provider when review succeeds", async () => {
    const mockPrimary: AIProvider = {
      name: "openai",
      review: vi.fn().mockResolvedValue({ summary: "Primary ok", findings: [] }),
      validateConfiguration: vi.fn(),
    };

    const mockFallback: AIProvider = {
      name: "gemini",
      review: vi.fn(),
      validateConfiguration: vi.fn(),
    };

    const req: AIReviewRequest = {
      files: [],
      defaultStrictness: "standard",
      customRules: [],
    };

    const result = await executeReviewWithFallback(
      req,
      mockPrimary,
      "gpt-4o",
      mockFallback,
      "gemini-2.5-flash"
    );

    expect(result.activeProvider).toBe("openai");
    expect(result.activeModel).toBe("gpt-4o");
    expect(result.fallbackUsed).toBe(false);
    expect(mockFallback.review).not.toHaveBeenCalled();
  });

  it("switches to fallback provider on retryable error", async () => {
    const retryableError = new Error("Rate limit exceeded") as Error & { status: number };
    retryableError.status = 429;

    const mockPrimary: AIProvider = {
      name: "openai",
      review: vi.fn().mockRejectedValue(retryableError),
      validateConfiguration: vi.fn(),
    };

    const mockFallback: AIProvider = {
      name: "gemini",
      review: vi.fn().mockResolvedValue({ summary: "Fallback review done", findings: [] }),
      validateConfiguration: vi.fn(),
    };

    const req: AIReviewRequest = {
      files: [],
      defaultStrictness: "standard",
      customRules: [],
    };

    const result = await executeReviewWithFallback(
      req,
      mockPrimary,
      "gpt-4o",
      mockFallback,
      "gemini-2.5-flash"
    );

    expect(result.activeProvider).toBe("gemini");
    expect(result.activeModel).toBe("gemini-2.5-flash");
    expect(result.fallbackUsed).toBe(true);
    expect(mockFallback.review).toHaveBeenCalled();
  });

  it("does not switch to fallback on non-retryable 401 authentication errors", async () => {
    const authError = new Error("Invalid API Key") as Error & { status: number };
    authError.status = 401;

    const mockPrimary: AIProvider = {
      name: "openai",
      review: vi.fn().mockRejectedValue(authError),
      validateConfiguration: vi.fn(),
    };

    const mockFallback: AIProvider = {
      name: "gemini",
      review: vi.fn(),
      validateConfiguration: vi.fn(),
    };

    const req: AIReviewRequest = {
      files: [],
      defaultStrictness: "standard",
      customRules: [],
    };

    await expect(
      executeReviewWithFallback(req, mockPrimary, "gpt-4o", mockFallback, "gemini-2.5-flash")
    ).rejects.toThrow("Invalid API Key");

    expect(mockFallback.review).not.toHaveBeenCalled();
  });
});
