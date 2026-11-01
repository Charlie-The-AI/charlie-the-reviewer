import { describe, it, expect } from "vitest";
import { LocalGit } from "../../src/git/local.js";

describe("LocalGit Subprocess Wrapper", () => {
  const git = new LocalGit();

  it("verifies repository is inside a git working tree", async () => {
    const isRepo = await git.isGitRepository();
    expect(isRepo).toBe(true);
  });

  it("retrieves current branch name or commit hash", async () => {
    const ref = await git.getCurrentBranchOrCommit();
    expect(typeof ref).toBe("string");
    expect(ref.length).toBeGreaterThan(0);
  });

  it("executes safe commands and returns stdout", async () => {
    const status = await git.runGit(["status", "--porcelain"]);
    expect(typeof status).toBe("string");
  });

  it("throws clear error on invalid git command", async () => {
    await expect(git.runGit(["non-existent-command"])).rejects.toThrow("Git command failed");
  });

  it("rejects invalid git refs that start with dashes to prevent flag injection", async () => {
    await expect(git.getBranchDiff("--inject-flag")).rejects.toThrow("Invalid git ref");
    await expect(git.getCommitDiff("--inject-flag")).rejects.toThrow("Invalid commit SHA");
  });
});
