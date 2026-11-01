import type { ChangedFile, ReviewConfig, ReviewResult, StrictnessLevel } from "../types/index.js";
import { resolveConfiguration } from "../config/loader.js";
import { LocalGit } from "../git/local.js";
import { ReviewOrchestrator } from "./orchestrator.js";
import { GitHubClient } from "../integrations/github/client.js";
import {
  fetchPullRequestFiles,
  fetchPullRequestMetadata,
} from "../integrations/github/pull-request.js";
import { GitHubReporter } from "../reporters/github.js";
import { logger } from "../utils/logger.js";

export interface CreateReviewerOptions {
  provider?: "openai" | "gemini" | string;
  model?: string;
  strictness?: StrictnessLevel;
  configPath?: string;
  cwd?: string;
  config?: Partial<ReviewConfig>;
  quiet?: boolean;
  debug?: boolean;
}

export interface ReviewExecutionOptions {
  base?: string;
  head?: string;
  staged?: boolean;
  commit?: string;
  pr?: number;
  postGithubReview?: boolean;
}

export class Reviewer {
  readonly config: ReviewConfig;
  readonly cwd: string;
  private orchestrator: ReviewOrchestrator;
  private localGit: LocalGit;

  constructor(options: CreateReviewerOptions = {}) {
    this.cwd = options.cwd || process.cwd();

    if (options.quiet !== undefined) logger.setQuiet(options.quiet);
    if (options.debug !== undefined) logger.setDebug(options.debug);

    // Build configuration overrides from constructor arguments
    const overrides: Partial<ReviewConfig> = { ...options.config };
    if (options.provider) {
      overrides.ai = {
        ...(overrides.ai || ({} as ReviewConfig["ai"])),
        provider: options.provider,
        model: options.model || (overrides.ai?.model ?? "gpt-4o"),
      };
    } else if (options.model) {
      overrides.ai = {
        ...(overrides.ai || ({} as ReviewConfig["ai"])),
        provider: overrides.ai?.provider ?? "openai",
        model: options.model,
      };
    }

    if (options.strictness) {
      overrides.review = {
        ...(overrides.review || ({} as ReviewConfig["review"])),
        strictness: options.strictness,
        fail_on: overrides.review?.fail_on || ["critical", "high"],
        minimum_confidence: overrides.review?.minimum_confidence || 0.75,
        max_comments: overrides.review?.max_comments || 25,
        noise_reduction: overrides.review?.noise_reduction || { enabled: true, deduplicate: true },
        enforcement: overrides.review?.enforcement || { enabled: true, mode: "status_check" },
      };
    }

    this.config = resolveConfiguration({
      configPath: options.configPath,
      cwd: this.cwd,
      overrides,
    });

    this.orchestrator = new ReviewOrchestrator({
      config: this.config,
      cwd: this.cwd,
    });

    this.localGit = new LocalGit({ cwd: this.cwd });
  }

  /**
   * Universal review method dispatching to the appropriate source.
   */
  async review(options: ReviewExecutionOptions = {}): Promise<ReviewResult> {
    if (options.pr !== undefined) {
      return this.reviewPullRequest(options.pr, {
        postToGithub: options.postGithubReview,
      });
    }

    if (options.commit) {
      return this.reviewCommit(options.commit);
    }

    if (options.staged) {
      return this.reviewStaged();
    }

    if (options.base) {
      return this.reviewBranch(options.base, options.head || "HEAD");
    }

    return this.reviewWorkingTree();
  }

  /**
   * Review custom provided list of ChangedFile objects.
   */
  async reviewFiles(files: ChangedFile[]): Promise<ReviewResult> {
    const { result } = await this.orchestrator.runReview({ changedFiles: files });
    return result;
  }

  /**
   * Review local uncommitted working tree changes.
   */
  async reviewWorkingTree(): Promise<ReviewResult> {
    logger.info("Collecting local working tree changes...");
    const files = await this.localGit.getWorkingTreeDiff();
    const { result } = await this.orchestrator.runReview({ changedFiles: files });
    return result;
  }

  /**
   * Review local staged changes (git diff --cached).
   */
  async reviewStaged(): Promise<ReviewResult> {
    logger.info("Collecting staged Git changes...");
    const files = await this.localGit.getStagedDiff();
    const { result } = await this.orchestrator.runReview({ changedFiles: files });
    return result;
  }

  /**
   * Review changes between base branch and head.
   */
  async reviewBranch(base: string, head: string = "HEAD"): Promise<ReviewResult> {
    logger.info(`Collecting diff between ${base} and ${head}...`);
    const files = await this.localGit.getBranchDiff(base, head);
    const { result } = await this.orchestrator.runReview({ changedFiles: files });
    return result;
  }

  /**
   * Review changes in a specific commit.
   */
  async reviewCommit(commitSha: string): Promise<ReviewResult> {
    logger.info(`Collecting diff for commit ${commitSha}...`);
    const files = await this.localGit.getCommitDiff(commitSha);
    const { result } = await this.orchestrator.runReview({ changedFiles: files });
    return result;
  }

  /**
   * Review GitHub Pull Request.
   */
  async reviewPullRequest(
    pullNumber: number,
    options: { postToGithub?: boolean } = {}
  ): Promise<ReviewResult> {
    logger.info(`Fetching PR #${pullNumber} from GitHub...`);
    const client = new GitHubClient();
    const prMeta = await fetchPullRequestMetadata(client, pullNumber);
    const files = await fetchPullRequestFiles(client, pullNumber);

    logger.info(`Analyzing PR #${pullNumber}: "${prMeta.title}" (${files.length} changed files)`);
    const { result, changedFilesMap } = await this.orchestrator.runReview({
      changedFiles: files,
    });

    if (options.postToGithub !== false && process.env.GITHUB_TOKEN) {
      try {
        const reporter = new GitHubReporter({
          pullNumber,
          commitSha: prMeta.headSha,
        });
        await reporter.report(result, changedFilesMap);
      } catch (err) {
        logger.warn(
          `Failed to post review results back to GitHub: ${
            err instanceof Error ? err.message : String(err)
          }`
        );
      }
    }

    return result;
  }
}

export function createReviewer(options?: CreateReviewerOptions): Reviewer {
  return new Reviewer(options);
}
