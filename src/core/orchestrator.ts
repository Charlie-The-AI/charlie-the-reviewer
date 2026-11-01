import type {
  ChangedFile,
  ReviewConfig,
  ReviewFinding,
  ReviewResult,
  ReviewStatus,
} from "../types/index.js";
import { filterAndPrepareDiff, batchReviewFiles } from "../git/diff.js";
import { ContextCollector } from "./context.js";
import { ProviderRegistry, executeReviewWithFallback } from "../providers/registry.js";
import { processAndFilterFindings } from "./findings.js";
import { getBlockingFindings } from "./severity.js";
import { estimateCostUSD } from "../utils/tokens.js";
import { logger } from "../utils/logger.js";

export interface OrchestrationOptions {
  config: ReviewConfig;
  changedFiles: ChangedFile[];
  cwd?: string;
  providerOverride?: string;
  modelOverride?: string;
}

export class ReviewOrchestrator {
  private config: ReviewConfig;
  private cwd: string;
  private contextCollector: ContextCollector;

  constructor(options: { config: ReviewConfig; cwd?: string }) {
    this.config = options.config;
    this.cwd = options.cwd || process.cwd();
    this.contextCollector = new ContextCollector({
      cwd: this.cwd,
      maxContextTokens: 10000,
      maxFiles: 5,
    });
  }

  async runReview(options: {
    changedFiles: ChangedFile[];
    providerOverride?: string;
    modelOverride?: string;
  }): Promise<{
    result: ReviewResult;
    changedFilesMap: Map<string, ChangedFile>;
  }> {
    const startTime = Date.now();
    const config = { ...this.config };

    if (options.providerOverride) {
      config.ai = { ...config.ai, provider: options.providerOverride };
    }
    if (options.modelOverride) {
      config.ai = { ...config.ai, model: options.modelOverride };
    }

    // 1. Filter and prepare reviewable files
    const filterResult = filterAndPrepareDiff(options.changedFiles, {
      ignorePatterns: config.ignore,
      maxFiles: config.limits.max_files,
      maxDiffLines: config.limits.max_diff_lines,
      defaultStrictness: config.review.strictness,
      overrides: config.review.overrides,
      customRules: config.review.custom_rules,
    });

    const { reviewableFiles, skippedFiles, changedFilesMap } = filterResult;

    if (reviewableFiles.length === 0) {
      logger.info("No reviewable files found after applying ignore patterns and filters.");
      const emptyResult: ReviewResult = {
        summary: "No changed files eligible for AI code review.",
        findings: [],
        reviewedFiles: [],
        skippedFiles: skippedFiles.map((s) => `${s.filename} (${s.reason})`),
        provider: config.ai.provider,
        model: config.ai.model,
        durationMs: Date.now() - startTime,
        status: "passed",
        blockingFindings: [],
      };
      return { result: emptyResult, changedFilesMap };
    }

    // 2. Collect bounded surrounding context
    const filePaths = reviewableFiles.map((f) => f.filename);
    const contextMap = this.contextCollector.collectContextForFiles(filePaths);

    for (const file of reviewableFiles) {
      const ctx = contextMap.get(file.filename);
      if (ctx) {
        file.context = ctx;
      }
    }

    // 3. Resolve AI provider and fallback
    const { primary, primaryModel, fallback, fallbackModel } =
      ProviderRegistry.resolveReviewProviders(config);

    // 4. Batch files to respect token budgeting and concurrency limits
    const batches = batchReviewFiles(reviewableFiles, config.limits.max_input_tokens);

    const allFindings: ReviewFinding[] = [];
    const summaryParts: string[] = [];
    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    let activeProviderName = primary.name;
    let activeModelName = primaryModel;
    let fallbackUsed = false;
    let hasProviderError = false;
    let providerErrorMessage = "";

    for (let bIndex = 0; bIndex < batches.length; bIndex++) {
      const batchFiles = batches[bIndex]!;
      logger.info(
        `Analyzing batch ${bIndex + 1}/${batches.length} (${batchFiles.length} file(s)) using ${config.ai.provider}...`
      );

      try {
        const {
          response,
          activeProvider,
          activeModel,
          fallbackUsed: fellBack,
        } = await executeReviewWithFallback(
          {
            files: batchFiles,
            defaultStrictness: config.review.strictness,
            customRules: config.review.custom_rules || [],
          },
          primary,
          primaryModel,
          fallback,
          fallbackModel
        );

        activeProviderName = activeProvider;
        activeModelName = activeModel;
        if (fellBack) fallbackUsed = true;

        if (response.summary) {
          summaryParts.push(response.summary);
        }
        if (response.findings && response.findings.length > 0) {
          allFindings.push(...response.findings);
        }
        if (response.usage) {
          totalInputTokens += response.usage.inputTokens;
          totalOutputTokens += response.usage.outputTokens;
        }
      } catch (err) {
        hasProviderError = true;
        providerErrorMessage = err instanceof Error ? err.message : String(err);
        logger.error(`AI analysis failed for batch ${bIndex + 1}: ${providerErrorMessage}`);
        break;
      }
    }

    // 5. Deduplicate and filter findings based on confidence and limits
    const filteredFindings = processAndFilterFindings(allFindings, {
      minimumConfidence: config.review.minimum_confidence,
      maxComments: config.review.max_comments,
      noiseReduction: config.review.noise_reduction.enabled,
    });

    // 6. Evaluate blocking conditions
    const blockingFindings = getBlockingFindings(filteredFindings, config.review.fail_on);

    // Determine status
    let status: ReviewStatus = "passed";
    if (hasProviderError) {
      status = "incomplete";
    } else if (blockingFindings.length > 0) {
      status = "failed";
    }

    // Cost estimation
    const estimatedCost = estimateCostUSD(activeModelName, totalInputTokens, totalOutputTokens);

    const overallSummary =
      summaryParts.length > 0
        ? summaryParts.join("\n\n")
        : hasProviderError
          ? `Review incomplete due to provider failure: ${providerErrorMessage}`
          : "Review completed successfully. No major issues detected.";

    const reviewedFilePaths = reviewableFiles.map((f) => f.filename);
    const skippedFileLabels = skippedFiles.map((s) => `${s.filename} (${s.reason})`);

    const result: ReviewResult = {
      summary: overallSummary,
      findings: filteredFindings,
      reviewedFiles: reviewedFilePaths,
      skippedFiles: skippedFileLabels,
      provider: activeProviderName,
      model: activeModelName,
      durationMs: Date.now() - startTime,
      status,
      blockingFindings,
      usage: {
        inputTokens: totalInputTokens,
        outputTokens: totalOutputTokens,
        estimatedCost,
      },
      metadata: {
        fallbackUsed,
        initialProvider: config.ai.provider,
        totalFiles: options.changedFiles.length,
        error: hasProviderError ? providerErrorMessage : undefined,
      },
    };

    return { result, changedFilesMap };
  }
}
