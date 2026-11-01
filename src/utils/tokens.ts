import type { ProviderModelPricing } from "../types/index.js";

/**
 * Standard estimated pricing per 1M tokens (USD)
 */
export const MODEL_PRICING: Record<string, ProviderModelPricing> = {
  // OpenAI Models
  "gpt-4o": { inputPerMillion: 2.5, outputPerMillion: 10.0 },
  "gpt-4o-mini": { inputPerMillion: 0.15, outputPerMillion: 0.6 },
  "gpt-4-turbo": { inputPerMillion: 10.0, outputPerMillion: 30.0 },
  "o3-mini": { inputPerMillion: 1.1, outputPerMillion: 4.4 },
  o1: { inputPerMillion: 15.0, outputPerMillion: 60.0 },
  "o1-mini": { inputPerMillion: 3.0, outputPerMillion: 12.0 },

  // Google Gemini Models
  "gemini-2.5-flash": { inputPerMillion: 0.15, outputPerMillion: 0.6 },
  "gemini-2.5-pro": { inputPerMillion: 1.25, outputPerMillion: 5.0 },
  "gemini-1.5-flash": { inputPerMillion: 0.075, outputPerMillion: 0.3 },
  "gemini-1.5-pro": { inputPerMillion: 1.25, outputPerMillion: 5.0 },
};

/**
 * Estimate token count from raw text using standard 4-characters-per-token heuristic.
 */
export function estimateTokenCount(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / 3.8);
}

/**
 * Estimate cost for given token usage and model name.
 */
export function estimateCostUSD(
  model: string,
  inputTokens: number = 0,
  outputTokens: number = 0
): number {
  // Normalize model string (strip prefixes like openai/ or gemini/)
  const normalized = model.toLowerCase().replace(/^(openai|gemini)\//, "");
  const pricing = MODEL_PRICING[normalized] ||
    // Partial match if version suffix is included (e.g. gpt-4o-2024-08-06)
    Object.entries(MODEL_PRICING).find(([key]) => normalized.startsWith(key))?.[1] || {
      inputPerMillion: 1.0,
      outputPerMillion: 3.0,
    };

  const inputCost = (inputTokens / 1_000_000) * pricing.inputPerMillion;
  const outputCost = (outputTokens / 1_000_000) * pricing.outputPerMillion;

  return Number((inputCost + outputCost).toFixed(6));
}
