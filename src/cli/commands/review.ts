import { createReviewer } from "../../core/reviewer.js";
import { renderConsoleReport } from "../../reporters/console.js";
import { formatReviewResultJson } from "../../reporters/json.js";
import { formatReviewSummaryMarkdown } from "../../reporters/markdown.js";
import type { StrictnessLevel } from "../../types/index.js";
import { logger } from "../../utils/logger.js";

export interface ReviewCommandOptions {
  provider?: string;
  model?: string;
  strictness?: StrictnessLevel;
  base?: string;
  head?: string;
  staged?: boolean;
  commit?: string;
  pr?: string;
  config?: string;
  format?: "console" | "json" | "markdown";
  postGithub?: boolean;
  quiet?: boolean;
  debug?: boolean;
}

export async function runReviewCommand(options: ReviewCommandOptions): Promise<number> {
  const format = options.format || "console";

  if (format === "json" || format === "markdown") {
    logger.setQuiet(true);
  }

  try {
    const reviewer = createReviewer({
      provider: options.provider,
      model: options.model,
      strictness: options.strictness,
      configPath: options.config,
      quiet: options.quiet,
      debug: options.debug,
    });

    const prNumber = options.pr ? parseInt(options.pr, 10) : undefined;
    if (options.pr && isNaN(prNumber!)) {
      logger.error(`Invalid pull request number: "${options.pr}"`);
      return 2;
    }

    const result = await reviewer.review({
      base: options.base,
      head: options.head,
      staged: options.staged,
      commit: options.commit,
      pr: prNumber,
      postGithubReview: options.postGithub,
    });

    // Output formatted report
    if (format === "json") {
      console.log(formatReviewResultJson(result));
    } else if (format === "markdown") {
      console.log(formatReviewSummaryMarkdown(result));
    } else {
      renderConsoleReport(result);
    }

    // Determine exit code
    if (result.status === "failed") {
      return 1;
    }

    if (result.status === "incomplete") {
      return 2;
    }

    return 0;
  } catch (err) {
    logger.error(
      `Review execution encountered a fatal error: ${err instanceof Error ? err.message : String(err)}`
    );
    return 2;
  }
}
