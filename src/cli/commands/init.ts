import { existsSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import pc from "picocolors";
import { logger } from "../../utils/logger.js";

const DEFAULT_CONFIG_YAML = `# Charlie the Reviewer Configuration
# Documentation: https://github.com/thesonofman/charlie-the-reviewer

ai:
  # Supported providers: openai, gemini
  provider: openai
  model: gpt-4o

  # Optional fallback provider if primary experiences rate limits or downtime
  fallback:
    enabled: false
    provider: gemini
    model: gemini-2.5-flash

  temperature: 0.1
  max_output_tokens: 4000

review:
  # Strictness levels: relaxed, standard, strict, maximum
  strictness: standard

  # Severities that fail the review / block merging: critical, high, medium, low
  fail_on:
    - critical
    - high

  minimum_confidence: 0.75
  max_comments: 25

  noise_reduction:
    enabled: true
    deduplicate: true

  # Path-based strictness overrides (glob patterns)
  overrides:
    - paths:
        - "src/auth/**"
        - "src/payments/**"
      strictness: maximum
    - paths:
        - "docs/**"
      strictness: relaxed

  # Custom repository review rules
  custom_rules:
    - id: avoid-console-log
      description: "Avoid console.log in production code"
      severity: low
    - id: api-error-handling
      description: "All external API calls must handle failures gracefully"
      severity: medium
    - id: transaction-integrity
      description: "Financial and payment operations must preserve transactional consistency"
      severity: critical
      paths:
        - "src/payments/**"
        - "src/wallet/**"

  enforcement:
    enabled: true
    mode: status_check

limits:
  max_files: 50
  max_diff_lines: 3000
  max_input_tokens: 60000
  max_output_tokens: 4000
  max_concurrent_requests: 3
  timeout_seconds: 120

ignore:
  - "**/*.min.js"
  - "**/*.min.css"
  - "**/*.map"
  - "**/package-lock.json"
  - "**/pnpm-lock.yaml"
  - "**/yarn.lock"
  - "**/dist/**"
  - "**/build/**"
`;

export async function runInitCommand(options: { force?: boolean } = {}): Promise<void> {
  const targetPath = resolve(process.cwd(), ".ai-reviewer.yml");

  if (existsSync(targetPath) && !options.force) {
    logger.warn(`Configuration file already exists at ${targetPath}. Use --force to overwrite.`);
    return;
  }

  writeFileSync(targetPath, DEFAULT_CONFIG_YAML, "utf-8");
  logger.success(`Created configuration file at ${pc.bold(".ai-reviewer.yml")}`);
  console.log();
  console.log(pc.cyan("Next steps:"));
  console.log(` 1. Set your AI provider API key:`);
  console.log(`    ${pc.gray('export OPENAI_API_KEY="your_key_here"')}`);
  console.log(`    or`);
  console.log(`    ${pc.gray('export GEMINI_API_KEY="your_key_here"')}`);
  console.log(` 2. Run a review on your working tree:`);
  console.log(`    ${pc.green("npx charlie-the-reviewer review")}`);
  console.log();
}
