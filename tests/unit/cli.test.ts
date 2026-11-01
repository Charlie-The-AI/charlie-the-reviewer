import { describe, it, expect, vi } from "vitest";
import { runConfigValidateCommand } from "../../src/cli/commands/config.js";
import { runProvidersListCommand } from "../../src/cli/commands/providers.js";
import { runInitCommand } from "../../src/cli/commands/init.js";
import { existsSync, unlinkSync } from "node:fs";
import { resolve } from "node:path";

describe("CLI Commands", () => {
  it("runs providers list command without error", () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    runProvidersListCommand();
    expect(logSpy).toHaveBeenCalled();
    logSpy.mockRestore();
  });

  it("creates configuration file in init command and warns if already exists", async () => {
    const testConfigPath = resolve(process.cwd(), ".ai-reviewer.yml");
    if (existsSync(testConfigPath)) {
      unlinkSync(testConfigPath);
    }

    await runInitCommand();
    expect(existsSync(testConfigPath)).toBe(true);

    // Running again without force should warn and not fail
    await runInitCommand();
    expect(existsSync(testConfigPath)).toBe(true);

    // Validate created config
    const exitCode = await runConfigValidateCommand({});
    expect(exitCode).toBe(0);

    // Clean up
    unlinkSync(testConfigPath);
  });

  it("returns exit code 1 when validating non-existent configuration", async () => {
    const exitCode = await runConfigValidateCommand({ config: "non-existent-file.yml" });
    expect(exitCode).toBe(1);
  });

  it("handles runReviewCommand options and formats safely", async () => {
    const { runReviewCommand } = await import("../../src/cli/commands/review.js");
    const { ProviderRegistry } = await import("../../src/providers/registry.js");

    class MockCliProvider {
      readonly name = "mock-cli";
      async review() {
        return { summary: "CLI mock review passed", findings: [] };
      }
      async validateConfiguration() {}
    }

    ProviderRegistry.registerProvider(
      "mock-cli",
      MockCliProvider as unknown as typeof import("../../src/providers/openai.js").OpenAIProvider
    );

    // Invalid PR should return exit code 2
    const codeInvalidPr = await runReviewCommand({ pr: "not-a-number", quiet: true });
    expect(codeInvalidPr).toBe(2);

    // Clean review on current working tree with json format using mock provider
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const codeClean = await runReviewCommand({
      provider: "mock-cli",
      format: "json",
      quiet: true,
    });
    expect(codeClean).toBe(0);
    expect(logSpy).toHaveBeenCalled();
    logSpy.mockRestore();
  });
});
