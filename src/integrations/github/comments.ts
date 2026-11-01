import type { GitHubClient } from "./client.js";
import type { ReviewFinding, ReviewResult } from "../../types/index.js";
import { formatReviewSummaryMarkdown, SUMMARY_MARKER } from "../../reporters/markdown.js";
import { logger } from "../../utils/logger.js";

export interface PostCommentsOptions {
  pullNumber: number;
  commitSha: string;
  result: ReviewResult;
  inlineFindings: ReviewFinding[];
  unmappedFindings?: ReviewFinding[];
}

export async function publishPullRequestReview(
  client: GitHubClient,
  options: PostCommentsOptions
): Promise<{
  summaryCommentId?: number;
  inlineCommentsPosted: number;
}> {
  const { pullNumber, commitSha, result, inlineFindings, unmappedFindings } = options;

  // 1. Post or update the PR summary comment
  let summaryCommentId: number | undefined;

  try {
    const existingComments = await client.octokit.paginate(
      client.octokit.rest.issues.listComments,
      {
        owner: client.owner,
        repo: client.repo,
        issue_number: pullNumber,
        per_page: 100,
      }
    );

    const previousSummary = existingComments.find((c) => c.body && c.body.includes(SUMMARY_MARKER));

    const summaryBody = formatReviewSummaryMarkdown(result, { unmappedFindings });

    if (previousSummary) {
      logger.info(`Updating previous PR summary comment #${previousSummary.id}`);
      const updated = await client.octokit.rest.issues.updateComment({
        owner: client.owner,
        repo: client.repo,
        comment_id: previousSummary.id,
        body: summaryBody,
      });
      summaryCommentId = updated.data.id;
    } else {
      logger.info(`Creating new PR summary comment on PR #${pullNumber}`);
      const created = await client.octokit.rest.issues.createComment({
        owner: client.owner,
        repo: client.repo,
        issue_number: pullNumber,
        body: summaryBody,
      });
      summaryCommentId = created.data.id;
    }
  } catch (err) {
    logger.warn(
      `Failed to post or update PR summary comment: ${err instanceof Error ? err.message : String(err)}`
    );
  }

  // 2. Post inline comments on diff lines
  let inlineCommentsPosted = 0;

  if (inlineFindings.length > 0) {
    // Fetch existing review comments to avoid posting duplicates
    let existingReviewComments: Array<{ path?: string; line?: number | null; body?: string }> = [];
    try {
      existingReviewComments = await client.octokit.paginate(
        client.octokit.rest.pulls.listReviewComments,
        {
          owner: client.owner,
          repo: client.repo,
          pull_number: pullNumber,
          per_page: 100,
        }
      );
    } catch (err) {
      logger.debug(
        `Could not fetch existing review comments: ${err instanceof Error ? err.message : String(err)}`
      );
    }

    for (const finding of inlineFindings) {
      // Check for duplicate comment
      const alreadyPosted = existingReviewComments.some((erc) => {
        return (
          erc.path === finding.file &&
          erc.line === finding.line &&
          erc.body &&
          erc.body.includes(finding.title)
        );
      });

      if (alreadyPosted) {
        logger.debug(`Skipping duplicate inline comment on ${finding.file}:${finding.line}`);
        continue;
      }

      const body = formatInlineCommentBody(finding);

      try {
        await client.octokit.rest.pulls.createReviewComment({
          owner: client.owner,
          repo: client.repo,
          pull_number: pullNumber,
          commit_id: commitSha,
          path: finding.file,
          line: finding.line,
          side: "RIGHT",
          body,
        });
        inlineCommentsPosted++;
      } catch (err) {
        logger.warn(
          `Failed to post inline comment on ${finding.file}:${finding.line}: ${
            err instanceof Error ? err.message : String(err)
          }`
        );
      }
    }
  }

  return { summaryCommentId, inlineCommentsPosted };
}

function formatInlineCommentBody(finding: ReviewFinding): string {
  let body = `**${finding.severity.toUpperCase()} — ${finding.title}**\n\n`;
  body += `${finding.description}\n\n`;

  if (finding.ruleId) {
    body += `*Violates Rule:* \`${finding.ruleId}\`\n\n`;
  }

  if (finding.suggestion) {
    body += `**Suggested fix:**\n\`\`\`suggestion\n${finding.suggestion}\n\`\`\`\n`;
  }

  body += `\n*AI Confidence: ${(finding.confidence * 100).toFixed(0)}%*`;
  return body;
}
