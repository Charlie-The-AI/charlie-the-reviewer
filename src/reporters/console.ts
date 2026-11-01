import pc from "picocolors";
import type { ReviewResult, Severity } from "../types/index.js";

const SEVERITY_COLORS: Record<Severity, (s: string) => string> = {
  critical: (s) => pc.bold(pc.red(s)),
  high: (s) => pc.red(s),
  medium: (s) => pc.yellow(s),
  low: (s) => pc.cyan(s),
};

export function renderConsoleReport(result: ReviewResult): void {
  console.log();
  console.log(pc.bold(pc.cyan("==================================================")));
  console.log(pc.bold(pc.cyan("            AI CODE REVIEW RESULTS                ")));
  console.log(pc.bold(pc.cyan("==================================================")));
  console.log();

  const statusColor =
    result.status === "passed"
      ? pc.bold(pc.green("PASSED"))
      : result.status === "failed"
        ? pc.bold(pc.red("FAILED"))
        : result.status === "incomplete"
          ? pc.bold(pc.yellow("INCOMPLETE"))
          : pc.gray("SKIPPED");

  console.log(`${pc.bold("Status:")}     ${statusColor}`);
  console.log(`${pc.bold("Provider:")}   ${result.provider} (${result.model})`);
  console.log(`${pc.bold("Duration:")}   ${(result.durationMs / 1000).toFixed(2)}s`);
  console.log(`${pc.bold("Reviewed:")}   ${result.reviewedFiles.length} file(s)`);
  if (result.skippedFiles.length > 0) {
    console.log(`${pc.bold("Skipped:")}    ${result.skippedFiles.length} file(s)`);
  }
  if (result.usage) {
    const cost =
      result.usage.estimatedCost !== undefined
        ? ` (~$${result.usage.estimatedCost.toFixed(4)})`
        : "";
    console.log(
      `${pc.bold("Tokens:")}     ${result.usage.inputTokens ?? 0} in / ${result.usage.outputTokens ?? 0} out${cost}`
    );
  }
  console.log();

  console.log(pc.bold("--- High-Level Summary ---"));
  console.log(result.summary);
  console.log();

  if (result.findings.length === 0) {
    console.log(pc.green("✔ No issues or policy violations detected."));
    console.log();
    return;
  }

  console.log(pc.bold(`--- Findings (${result.findings.length}) ---`));
  console.log();

  for (let i = 0; i < result.findings.length; i++) {
    const f = result.findings[i]!;
    const badge = SEVERITY_COLORS[f.severity](`[${f.severity.toUpperCase()}]`);
    const loc = pc.underline(`${f.file}:${f.line}`);
    const conf = pc.gray(`(${(f.confidence * 100).toFixed(0)}% confidence)`);

    console.log(`${i + 1}. ${badge} ${pc.bold(f.title)} ${conf}`);
    console.log(`   Location: ${loc}`);
    if (f.ruleId) {
      console.log(`   Rule:     ${pc.magenta(f.ruleId)}`);
    }
    console.log(`   Category: ${f.category}`);
    console.log(`   Detail:   ${f.description}`);
    if (f.suggestion) {
      console.log(`   Suggested Fix:`);
      const lines = f.suggestion.split("\n");
      for (const line of lines) {
        console.log(`     ${pc.green("+")} ${line}`);
      }
    }
    console.log();
  }

  if (result.blockingFindings.length > 0) {
    console.log(
      pc.bold(
        pc.red(
          `✖ Review failed: ${result.blockingFindings.length} merge-blocking issue(s) detected.`
        )
      )
    );
  }
  console.log();
}
