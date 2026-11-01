import OpenAI from "openai";
import type { AIProvider, ProviderFactoryOptions } from "./interface.js";
import type { AIReviewRequest, AIReviewResponse } from "../types/index.js";
import { buildFileReviewInstructions, buildSystemPrompt } from "../core/policies.js";
import { parseAndValidateAIResponse } from "../core/findings.js";
import { withRetry } from "../utils/retry.js";
import { logger } from "../utils/logger.js";

export class OpenAIProvider implements AIProvider {
  readonly name = "openai";
  private client: OpenAI;
  private model: string;
  private temperature: number;
  private maxOutputTokens: number;
  private apiKey?: string;

  constructor(options: ProviderFactoryOptions) {
    this.model = options.model || "gpt-4o";
    this.temperature = options.temperature ?? 0.1;
    this.maxOutputTokens = options.maxOutputTokens ?? 4000;
    this.apiKey = options.apiKey || process.env.OPENAI_API_KEY;

    this.client = new OpenAI({
      apiKey: this.apiKey || "missing-api-key",
      timeout: (options.timeoutSeconds ?? 120) * 1000,
    });
  }

  async validateConfiguration(): Promise<void> {
    if (!this.apiKey || this.apiKey.trim().length === 0 || this.apiKey === "missing-api-key") {
      throw new Error(
        "OpenAI API key is missing. Set the OPENAI_API_KEY environment variable or specify it in configuration."
      );
    }

    if (!this.model || this.model.trim().length === 0) {
      throw new Error("OpenAI model must be specified (e.g. 'gpt-4o', 'gpt-4o-mini', 'o3-mini').");
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

    const isReasoningModel =
      this.model.startsWith("o1") || this.model.startsWith("o3") || this.model.startsWith("o4");

    const completionParams: OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming = {
      model: this.model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
    };

    if (isReasoningModel) {
      completionParams.max_completion_tokens = this.maxOutputTokens;
      // Reasoning models do not accept custom temperature
    } else {
      completionParams.temperature = this.temperature;
      completionParams.max_tokens = this.maxOutputTokens;
    }

    logger.debug(`Calling OpenAI model=${this.model} files=${request.files.length}`);

    const response = await withRetry(
      async () => {
        return await this.client.chat.completions.create(completionParams);
      },
      {
        onRetry: (err, attempt, delayMs) => {
          logger.warn(
            `OpenAI API transient error on attempt ${attempt}. Retrying in ${delayMs}ms: ${
              err instanceof Error ? err.message : String(err)
            }`
          );
        },
      }
    );

    const choice = response.choices[0];
    const rawContent = choice?.message?.content || "{}";

    const parsed = parseAndValidateAIResponse(rawContent, reviewedFilePaths);

    if (parsed.parseErrors.length > 0) {
      logger.debug(`OpenAI response validation notes: ${parsed.parseErrors.join("; ")}`);
    }

    return {
      summary: parsed.summary,
      findings: parsed.findings,
      usage: {
        inputTokens: response.usage?.prompt_tokens ?? 0,
        outputTokens: response.usage?.completion_tokens ?? 0,
      },
      rawResponse: response,
    };
  }
}
