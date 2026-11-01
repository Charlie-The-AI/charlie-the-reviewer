import type { AIReviewRequest, AIReviewResponse } from "../types/index.js";

export interface AIProvider {
  /**
   * The unique identifier for the provider (e.g. 'openai', 'gemini').
   */
  readonly name: string;

  /**
   * Performs automated code review analysis on the requested files.
   */
  review(request: AIReviewRequest): Promise<AIReviewResponse>;

  /**
   * Validates configuration, credentials, and model availability.
   * Throws an Error with helpful guidance if misconfigured.
   */
  validateConfiguration(): Promise<void>;
}

export interface ProviderFactoryOptions {
  apiKey?: string;
  model: string;
  temperature?: number;
  maxOutputTokens?: number;
  timeoutSeconds?: number;
}
