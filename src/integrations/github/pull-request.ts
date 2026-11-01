import type { GitHubClient } from "./client.js";
import type { ChangedFile } from "../../types/index.js";
import { parseUnifiedDiff } from "../../git/parser.js";

export interface PullRequestMetadata {
  number: number;
  title: string;
  body: string;
  baseRef: string;
  headRef: string;
  headSha: string;
  author: string;
}

export async function fetchPullRequestMetadata(
  client: GitHubClient,
  pullNumber: number
): Promise<PullRequestMetadata> {
  const { data: pr } = await client.octokit.rest.pulls.get({
    owner: client.owner,
    repo: client.repo,
    pull_number: pullNumber,
  });

  return {
    number: pr.number,
    title: pr.title,
    body: pr.body || "",
    baseRef: pr.base.ref,
    headRef: pr.head.ref,
    headSha: pr.head.sha,
    author: pr.user?.login || "unknown",
  };
}

export async function fetchPullRequestFiles(
  client: GitHubClient,
  pullNumber: number
): Promise<ChangedFile[]> {
  // Use octokit.paginate to ensure all pages are retrieved without skipping files
  const rawFiles = await client.octokit.paginate(client.octokit.rest.pulls.listFiles, {
    owner: client.owner,
    repo: client.repo,
    pull_number: pullNumber,
    per_page: 100,
  });

  const changedFiles: ChangedFile[] = [];

  for (const item of rawFiles) {
    const filename = item.filename;
    const isBinary = !item.patch && item.status !== "removed";
    let status: ChangedFile["status"] = "modified";
    if (item.status === "added") status = "added";
    else if (item.status === "removed") status = "deleted";
    else if (item.status === "renamed") status = "renamed";

    let hunks: ChangedFile["hunks"] = [];
    let addedLineNumbers: number[] = [];
    let modifiedLineNumbers: number[] = [];

    if (item.patch) {
      // Create a simulated unified diff header so our parser extracts exact hunks and line numbers
      const fakeDiff = `diff --git a/${filename} b/${filename}\n--- a/${filename}\n+++ b/${filename}\n${item.patch}`;
      const parsed = parseUnifiedDiff(fakeDiff);
      if (parsed[0]) {
        hunks = parsed[0].hunks;
        addedLineNumbers = parsed[0].addedLineNumbers;
        modifiedLineNumbers = parsed[0].modifiedLineNumbers;
      }
    }

    changedFiles.push({
      filename,
      oldFilename: item.previous_filename,
      status,
      additions: item.additions,
      deletions: item.deletions,
      patch: item.patch || "",
      hunks,
      addedLineNumbers,
      modifiedLineNumbers,
      isBinary,
    });
  }

  return changedFiles;
}
