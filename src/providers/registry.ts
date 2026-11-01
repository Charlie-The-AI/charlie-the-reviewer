import type { AIProvider, ProviderFactoryOptions } from "./interface.js";
import { OpenAIProvider } from "./openai.js";
import { GeminiProvider } from "./gemini.js";
import type { ReviewConfig } from "../types/index.js";
import { logger } from "../utils/logger.js";
import { isRetryableNetworkOrRateLimitError } from "../utils/retry.js";

export type ProviderConstructor = new (options: ProviderFactoryOptions) => AIProvider;

export class ProviderRegistry {
  private static providers = new Map<string, ProviderConstructor>([
    ["openai", OpenAIProvider],
    ["gemini", GeminiProvider],
  ]);

  /**
   * Register a new or custom AI provider (extension point for Claude, Ollama, etc.)
   */
  static registerProvider(name: string, ctor: ProviderConstructor): void {
    this.providers.set(name.toLowerCase().trim(), ctor);
  }

  /**
   * List all registered provider identifiers.
   */
  static getRegisteredProviders(): string[] {
    return Array.from(this.providers.keys());
  }

  /**
   * Create an instance of a registered provider.
   */
  static createProvider(providerName: string, options: ProviderFactoryOptions): AIProvider {
    const key = providerName.toLowerCase().trim();
    const ctor = this.providers.get(key);

    if (!ctor) {
      const available = this.getRegisteredProviders().join(", ");
      throw new Error(
        `Unsupported AI provider "${providerName}". Supported providers are: ${available}. ` +
          `Additional providers (e.g. Anthropic Claude, Ollama, OpenRouter) can be registered via ProviderRegistry.registerProvider.`
      );
    }

    return new ctor(options);
  }

  /**
   * Creates the configured primary provider and optional fallback provider based on ReviewConfig.
   */
  static resolveReviewProviders(config: ReviewConfig): {
    primary: AIProvider;
    primaryModel: string;
    fallback?: AIProvider;
    fallbackModel?: string;
  } {
    const primaryName = config.ai.provider;
    const primaryModel = config.ai.model;

    const primary = this.createProvider(primaryName, {
      model: primaryModel,
      temperature: config.ai.temperature,
      maxOutputTokens: config.ai.max_output_tokens,
      timeoutSeconds: config.limits.timeout_seconds,
    });

    let fallback: AIProvider | undefined;
    let fallbackModel: string | undefined;

    if (config.ai.fallback?.enabled) {
      fallbackModel = config.ai.fallback.model;
      fallback = this.createProvider(config.ai.fallback.provider, {
        model: fallbackModel,
        temperature: config.ai.temperature,
        maxOutputTokens: config.ai.max_output_tokens,
        timeoutSeconds: config.limits.timeout_seconds,
      });
    }

    return { primary, primaryModel, fallback, fallbackModel };
  }
}

/**
 * Executes a review request on the primary provider, with safe conditional fallback
 * if the primary provider suffers a retryable rate limit or service outage.
 */
export async function executeReviewWithFallback(
  request: Parameters<AIProvider["review"]>[0],
  primaryProvider: AIProvider,
  primaryModel: string,
  fallbackProvider?: AIProvider,
  fallbackModel?: string
): Promise<{
  response: ReturnType<AIProvider["review"]> extends Promise<infer R> ? R : never;
  activeProvider: string;
  activeModel: string;
  fallbackUsed: boolean;
}> {
  try {
    const response = await primaryProvider.review(request);
    return {
      response,
      activeProvider: primaryProvider.name,
      activeModel: primaryModel,
      fallbackUsed: false,
    };
  } catch (error) {
    const isRetryable = isRetryableNetworkOrRateLimitError(error);

    if (fallbackProvider && fallbackModel && isRetryable) {
      logger.warn(
        `Primary provider "${primaryProvider.name}" encountered a retryable failure (${
          error instanceof Error ? error.message : String(error)
        }). Switching to configured fallback provider "${fallbackProvider.name}" (${fallbackModel}).`
      );

      const response = await fallbackProvider.review(request);
      return {
        response,
        activeProvider: fallbackProvider.name,
        activeModel: fallbackModel,
        fallbackUsed: true,
      };
    }

    // Do not fall back on authentication errors or non-retryable issues
    throw error;
  }
}
