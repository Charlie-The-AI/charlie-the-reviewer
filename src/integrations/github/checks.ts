import type { GitHubClient } from "./client.js";
import type { ReviewResult } from "../../types/index.js";
import { logger } from "../../utils/logger.js";

export async function createGitHubCheckRun(
  client: GitHubClient,
  headSha: string,
  result: ReviewResult
): Promise<number | undefined> {
  const conclusion =
    result.status === "passed"
      ? "success"
      : result.status === "failed"
        ? "failure"
        : result.status === "incomplete"
          ? "neutral"
          : "skipped";

  const title =
    result.status === "passed"
      ? "AI Code Review: Passed"
      : result.status === "failed"
        ? `AI Code Review: Failed (${result.blockingFindings.length} blocking issues)`
        : `AI Code Review: ${result.status}`;

  const summary =
    `AI Review completed in ${(result.durationMs / 1000).toFixed(2)}s using ${result.provider} (${result.model}).\n` +
    `Reviewed: ${result.reviewedFiles.length} files. Skipped: ${result.skippedFiles.length} files. Total findings: ${result.findings.length}.`;

  try {
    const { data: check } = await client.octokit.rest.checks.create({
      owner: client.owner,
      repo: client.repo,
      name: "AI Code Review",
      head_sha: headSha,
      status: "completed",
      conclusion,
      output: {
        title,
        summary,
        text: result.summary,
      },
    });

    logger.info(`Created GitHub Check Run #${check.id} with conclusion "${conclusion}"`);
    return check.id;
  } catch (err) {
    logger.warn(
      `Could not create GitHub Check Run (requires checks:write permission): ${err instanceof Error ? err.message : String(err)}`
    );
    return undefined;
  }
}
