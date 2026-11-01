import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { parseUnifiedDiff } from "./parser.js";
import type { ChangedFile } from "../types/index.js";

const execFileAsync = promisify(execFile);

export interface LocalGitOptions {
  cwd?: string;
  maxBuffer?: number;
}

export class LocalGit {
  private cwd: string;
  private maxBuffer: number;

  constructor(options: LocalGitOptions = {}) {
    this.cwd = options.cwd || process.cwd();
    // Default 50MB max buffer to safely handle large diffs
    this.maxBuffer = options.maxBuffer || 50 * 1024 * 1024;
  }

  /**
   * Executes a git command safely passing arguments as an array (never shell string concatenation).
   */
  async runGit(args: string[]): Promise<string> {
    try {
      const { stdout } = await execFileAsync("git", args, {
        cwd: this.cwd,
        maxBuffer: this.maxBuffer,
        env: {
          ...process.env,
          // Force deterministic diff output
          GIT_CONFIG_NOSYSTEM: "1",
          LC_ALL: "C",
        },
      });
      return stdout;
    } catch (err: unknown) {
      const execError = err as { code?: number; stderr?: string; message?: string };
      const stderr = execError.stderr ? `: ${execError.stderr.trim()}` : "";
      throw new Error(`Git command failed [git ${args.join(" ")}]${stderr}`);
    }
  }

  /**
   * Gets diff of staged changes.
   */
  async getStagedDiff(): Promise<ChangedFile[]> {
    const rawDiff = await this.runGit(["diff", "--cached", "--no-color", "--no-ext-diff", "-U3"]);
    return parseUnifiedDiff(rawDiff);
  }

  /**
   * Gets diff of working tree changes (unstaged or against HEAD).
   */
  async getWorkingTreeDiff(): Promise<ChangedFile[]> {
    try {
      // Check if repo has HEAD
      await this.runGit(["rev-parse", "--verify", "HEAD"]);
      const rawDiff = await this.runGit(["diff", "HEAD", "--no-color", "--no-ext-diff", "-U3"]);
      return parseUnifiedDiff(rawDiff);
    } catch {
      // If no commits yet in repository, diff against empty tree
      const rawDiff = await this.runGit(["diff", "--no-color", "--no-ext-diff", "-U3"]);
      return parseUnifiedDiff(rawDiff);
    }
  }

  /**
   * Gets diff between a base branch/ref and HEAD.
   */
  async getBranchDiff(base: string, head: string = "HEAD"): Promise<ChangedFile[]> {
    // Validate ref strings to prevent option injection
    if (base.startsWith("-") || head.startsWith("-")) {
      throw new Error(`Invalid git ref: "${base}" or "${head}"`);
    }

    const rawDiff = await this.runGit([
      "diff",
      `${base}...${head}`,
      "--no-color",
      "--no-ext-diff",
      "-U3",
    ]);
    return parseUnifiedDiff(rawDiff);
  }

  /**
   * Gets diff of a specific commit.
   */
  async getCommitDiff(commitSha: string): Promise<ChangedFile[]> {
    if (commitSha.startsWith("-")) {
      throw new Error(`Invalid commit SHA: "${commitSha}"`);
    }

    const rawDiff = await this.runGit([
      "show",
      commitSha,
      "--format=",
      "--no-color",
      "--no-ext-diff",
      "-U3",
    ]);
    return parseUnifiedDiff(rawDiff);
  }

  /**
   * Checks if current working directory is a git repository.
   */
  async isGitRepository(): Promise<boolean> {
    try {
      const out = await this.runGit(["rev-parse", "--is-inside-work-tree"]);
      return out.trim() === "true";
    } catch {
      return false;
    }
  }

  /**
   * Get current git branch name or commit hash.
   */
  async getCurrentBranchOrCommit(): Promise<string> {
    try {
      const branch = (await this.runGit(["rev-parse", "--abbrev-ref", "HEAD"])).trim();
      if (branch && branch !== "HEAD") {
        return branch;
      }
      return (await this.runGit(["rev-parse", "--short", "HEAD"])).trim();
    } catch {
      return "unknown";
    }
  }
}
