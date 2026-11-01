import { Command } from "commander";
import { runReviewCommand } from "./commands/review.js";
import { runInitCommand } from "./commands/init.js";
import { runConfigValidateCommand } from "./commands/config.js";
import { runProvidersListCommand } from "./commands/providers.js";
import { logger } from "../utils/logger.js";
import type { StrictnessLevel } from "../types/index.js";

const program = new Command();

program
  .name("charlie-the-reviewer")
  .description(
    "Charlie the Reviewer: Universal automated AI code reviewer for GitHub pull requests and local Git changes"
  )
  .version("0.1.0")
  .option("-c, --config <path>", "Path to custom configuration YAML file")
  .option("-q, --quiet", "Suppress non-essential console logs")
  .option("-d, --debug", "Enable verbose debug logs with secret redaction")
  .hook("preAction", (thisCommand) => {
    const opts = thisCommand.opts();
    if (opts.quiet) logger.setQuiet(true);
    if (opts.debug) logger.setDebug(true);
  });

program
  .command("review")
  .description("Review code changes using configured AI provider")
  .option("-p, --provider <name>", "Override AI provider (e.g. openai, gemini)")
  .option("-m, --model <name>", "Override AI model (e.g. gpt-4o, gemini-2.5-flash)")
  .option(
    "-s, --strictness <level>",
    "Override review strictness (relaxed, standard, strict, maximum)"
  )
  .option("--base <branch>", "Review changes against base branch")
  .option("--head <branch>", "Head ref for comparison (defaults to HEAD)")
  .option("--staged", "Review only staged Git changes")
  .option("--commit <sha>", "Review changes introduced in a specific commit")
  .option("--pr <number>", "Review a GitHub Pull Request by number")
  .option("--format <type>", "Output format (console, json, markdown)", "console")
  .option("--post-github", "Publish review comments and summary back to GitHub PR", false)
  .action(async (cmdOpts) => {
    const globalOpts = program.opts();
    const exitCode = await runReviewCommand({
      ...cmdOpts,
      config: globalOpts.config,
      quiet: globalOpts.quiet,
      debug: globalOpts.debug,
      strictness: cmdOpts.strictness as StrictnessLevel | undefined,
    });
    process.exit(exitCode);
  });

program
  .command("init")
  .description("Initialize a new .ai-reviewer.yml configuration file")
  .option("-f, --force", "Overwrite existing configuration file", false)
  .action(async (cmdOpts) => {
    await runInitCommand(cmdOpts);
  });

const configCmd = program.command("config").description("Manage and inspect configuration");

configCmd
  .command("validate")
  .description("Validate the AI Code Reviewer configuration file")
  .action(async () => {
    const globalOpts = program.opts();
    const exitCode = await runConfigValidateCommand({ config: globalOpts.config });
    process.exit(exitCode);
  });

const providersCmd = program.command("providers").description("Inspect supported AI providers");

providersCmd
  .command("list")
  .description("List registered AI providers, supported models, and setup guidance")
  .action(() => {
    runProvidersListCommand();
  });

// Default to help if no args provided
if (process.argv.length <= 2) {
  process.argv.push("--help");
}

program.parse(process.argv);
