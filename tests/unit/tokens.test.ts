import { describe, it, expect } from "vitest";
import { estimateTokenCount, estimateCostUSD } from "../../src/utils/tokens.js";

describe("Token Estimation & Cost Calculation", () => {
  it("estimates token count from text using 4-char heuristic", () => {
    const text = "function test() { return 42; }"; // 31 characters
    const tokens = estimateTokenCount(text);
    expect(tokens).toBeGreaterThan(0);
    expect(tokens).toBeLessThan(20);
    expect(estimateTokenCount("")).toBe(0);
  });

  it("calculates estimated cost for OpenAI gpt-4o accurately", () => {
    // 1,000,000 input tokens at $2.50 + 1,000,000 output tokens at $10.00 = $12.50
    const cost = estimateCostUSD("gpt-4o", 1_000_000, 1_000_000);
    expect(cost).toBe(12.5);
  });

  it("calculates estimated cost for Gemini 2.5 Flash accurately", () => {
    // 1,000,000 input tokens at $0.15 + 1,000,000 output tokens at $0.60 = $0.75
    const cost = estimateCostUSD("gemini-2.5-flash", 1_000_000, 1_000_000);
    expect(cost).toBe(0.75);
  });

  it("handles model version suffixes gracefully", () => {
    const cost = estimateCostUSD("gpt-4o-2024-08-06", 1_000_000, 1_000_000);
    expect(cost).toBe(12.5);
  });
});
