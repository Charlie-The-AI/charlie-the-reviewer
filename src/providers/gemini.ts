import { GoogleGenAI } from "@google/genai";
import type { AIProvider, ProviderFactoryOptions } from "./interface.js";
import type { AIReviewRequest, AIReviewResponse } from "../types/index.js";
import { buildFileReviewInstructions, buildSystemPrompt } from "../core/policies.js";
import { parseAndValidateAIResponse } from "../core/findings.js";
import { withRetry } from "../utils/retry.js";
import { logger } from "../utils/logger.js";

export class GeminiProvider implements AIProvider {
  readonly name = "gemini";
  private client: GoogleGenAI;
  private model: string;
  private temperature: number;
  private maxOutputTokens: number;
  private apiKey?: string;

  constructor(options: ProviderFactoryOptions) {
    this.model = options.model || "gemini-2.5-flash";
    this.temperature = options.temperature ?? 0.1;
    this.maxOutputTokens = options.maxOutputTokens ?? 4000;
    this.apiKey = options.apiKey || process.env.GEMINI_API_KEY;

    this.client = new GoogleGenAI({
      apiKey: this.apiKey || "missing-api-key",
    });
  }

  async validateConfiguration(): Promise<void> {
    if (!this.apiKey || this.apiKey.trim().length === 0 || this.apiKey === "missing-api-key") {
      throw new Error(
        "Google Gemini API key is missing. Set the GEMINI_API_KEY environment variable or specify it in configuration."
      );
    }

    if (!this.model || this.model.trim().length === 0) {
      throw new Error(
        "Gemini model must be specified (e.g. 'gemini-2.5-flash', 'gemini-2.5-pro')."
      );
    }
  }

  async review(request: AIReviewRequest): Promise<AIReviewResponse> {
    await this.validateConfiguration();

    const systemPrompt = buildSystemPrompt();
    const userPrompt = buildFileReviewInstructions(
      request.files,
      request.defaultStrictness,
      request.customRules
    );

    const reviewedFilePaths = request.files.map((f) => f.filename);

    logger.debug(`Calling Gemini model=${this.model} files=${request.files.length}`);

    const response = await withRetry(
      async () => {
        return await this.client.models.generateContent({
          model: this.model,
          contents: userPrompt,
          config: {
            systemInstruction: systemPrompt,
            responseMimeType: "application/json",
            temperature: this.temperature,
            maxOutputTokens: this.maxOutputTokens,
          },
        });
      },
      {
        onRetry: (err, attempt, delayMs) => {
          logger.warn(
            `Gemini API transient error on attempt ${attempt}. Retrying in ${delayMs}ms: ${
              err instanceof Error ? err.message : String(err)
            }`
          );
        },
      }
    );

    const rawContent = response.text || "{}";
    const parsed = parseAndValidateAIResponse(rawContent, reviewedFilePaths);

    if (parsed.parseErrors.length > 0) {
      logger.debug(`Gemini response validation notes: ${parsed.parseErrors.join("; ")}`);
    }

    return {
      summary: parsed.summary,
      findings: parsed.findings,
      usage: {
        inputTokens: response.usageMetadata?.promptTokenCount ?? 0,
        outputTokens: response.usageMetadata?.candidatesTokenCount ?? 0,
      },
      rawResponse: response,
    };
  }
}
