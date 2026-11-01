/**
 * @thesonofman/charlie-the-reviewer
 * Charlie the Reviewer: Universal automated AI-powered code reviews for GitHub pull requests and local Git changes.
 */

// Core Engine & Public Reviewer API
export {
  Reviewer,
  createReviewer,
  type CreateReviewerOptions,
  type ReviewExecutionOptions,
} from "./core/reviewer.js";
export { ReviewOrchestrator } from "./core/orchestrator.js";
export { resolveFileStrictness, STRICTNESS_DESCRIPTIONS } from "./core/strictness.js";
export { isSeverityBlocking, getBlockingFindings, compareSeverity } from "./core/severity.js";
export {
  parseAndValidateAIResponse,
  validateFindingsAgainstDiff,
  deduplicateFindings,
  processAndFilterFindings,
} from "./core/findings.js";
export { ContextCollector } from "./core/context.js";

// AI Providers
export type { AIProvider, ProviderFactoryOptions } from "./providers/interface.js";
export { ProviderRegistry, executeReviewWithFallback } from "./providers/registry.js";
export { OpenAIProvider } from "./providers/openai.js";
export { GeminiProvider } from "./providers/gemini.js";

// Git Analysis
export { parseUnifiedDiff } from "./git/parser.js";
export { filterAndPrepareDiff, batchReviewFiles } from "./git/diff.js";
export { LocalGit } from "./git/local.js";

// GitHub Integration
export { GitHubClient } from "./integrations/github/client.js";
export {
  fetchPullRequestMetadata,
  fetchPullRequestFiles,
} from "./integrations/github/pull-request.js";
export { publishPullRequestReview } from "./integrations/github/comments.js";
export { createGitHubCheckRun } from "./integrations/github/checks.js";

// Reporters
export { formatReviewSummaryMarkdown, SUMMARY_MARKER } from "./reporters/markdown.js";
export { formatReviewResultJson } from "./reporters/json.js";
export { renderConsoleReport } from "./reporters/console.js";
export { GitHubReporter } from "./reporters/github.js";

// Configuration
export { DEFAULT_CONFIG, DEFAULT_CONFIG_FILENAMES } from "./config/defaults.js";
export {
  ReviewConfigSchema,
  SeveritySchema,
  StrictnessLevelSchema,
  CustomRuleSchema,
  type ValidatedConfig,
} from "./config/schema.js";
export {
  resolveConfiguration,
  loadConfigFile,
  findConfigFile,
  validateConfigurationObject,
} from "./config/loader.js";

// Utilities
export { Logger, logger } from "./utils/logger.js";
export { redactSecrets } from "./utils/redaction.js";
export { withRetry, isRetryableNetworkOrRateLimitError } from "./utils/retry.js";
export { estimateCostUSD, estimateTokenCount, MODEL_PRICING } from "./utils/tokens.js";

// Types
export type {
  Severity,
  StrictnessLevel,
  ReviewStatus,
  CustomRule,
  StrictnessOverride,
  DiffLine,
  DiffHunk,
  ChangedFile,
  FileContext,
  ChangedFileReviewPayload,
  ReviewFinding,
  TokenUsage,
  ReviewResult,
  AIReviewRequest,
  AIReviewResponse,
  ReviewConfig,
  ProviderModelPricing,
} from "./types/index.js";
