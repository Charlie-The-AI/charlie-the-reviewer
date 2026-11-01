import { GitHubClient, type GitHubClientOptions } from "../integrations/github/client.js";
import { publishPullRequestReview } from "../integrations/github/comments.js";
import { createGitHubCheckRun } from "../integrations/github/checks.js";
import type { ChangedFile, ReviewResult } from "../types/index.js";
import { validateFindingsAgainstDiff } from "../core/findings.js";
import { logger } from "../utils/logger.js";

export interface GitHubReporterOptions extends GitHubClientOptions {
  pullNumber: number;
  commitSha: string;
}

export class GitHubReporter {
  private client: GitHubClient;
  private pullNumber: number;
  private commitSha: string;

  constructor(options: GitHubReporterOptions) {
    this.client = new GitHubClient(options);
    this.pullNumber = options.pullNumber;
    this.commitSha = options.commitSha;
  }

  async report(
    result: ReviewResult,
    changedFilesMap: Map<string, ChangedFile>
  ): Promise<{
    summaryCommentId?: number;
    inlineCommentsPosted: number;
    checkRunId?: number;
  }> {
    logger.info(`Publishing AI review to GitHub PR #${this.pullNumber}...`);

    // Separate findings into those mappable to diff lines vs unmapped findings
    const { validFindings, invalidOrUnmapped } = validateFindingsAgainstDiff(
      result.findings,
      changedFilesMap
    );

    // 1. Post PR summary and inline comments
    const { summaryCommentId, inlineCommentsPosted } = await publishPullRequestReview(this.client, {
      pullNumber: this.pullNumber,
      commitSha: this.commitSha,
      result,
      inlineFindings: validFindings,
      unmappedFindings: invalidOrUnmapped,
    });

    // 2. Post GitHub Check Run if token has permissions
    const checkRunId = await createGitHubCheckRun(this.client, this.commitSha, result);

    return {
      summaryCommentId,
      inlineCommentsPosted,
      checkRunId,
    };
  }
}
