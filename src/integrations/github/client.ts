import { Octokit } from "octokit";

export interface GitHubClientOptions {
  token?: string;
  repository?: string; // "owner/repo"
}

export class GitHubClient {
  readonly octokit: Octokit;
  readonly owner: string;
  readonly repo: string;

  constructor(options: GitHubClientOptions = {}) {
    const token = options.token || process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
    if (!token) {
      throw new Error(
        "GitHub token is required for GitHub integration. Set GITHUB_TOKEN or pass token in options."
      );
    }

    this.octokit = new Octokit({ auth: token });

    const repoSlug = options.repository || process.env.GITHUB_REPOSITORY;
    if (repoSlug && repoSlug.includes("/")) {
      const [owner, repo] = repoSlug.split("/");
      this.owner = owner!;
      this.repo = repo!;
    } else {
      this.owner = "";
      this.repo = "";
    }
  }

  hasRepositoryContext(): boolean {
    return Boolean(this.owner && this.repo);
  }
}
