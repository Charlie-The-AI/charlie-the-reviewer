import type { ReviewFinding, Severity } from "../types/index.js";

export const SEVERITY_ORDER: Record<Severity, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

/**
 * Checks if a severity is at or above a blocking threshold.
 */
export function isSeverityBlocking(severity: Severity, failOnList: Severity[]): boolean {
  return failOnList.includes(severity);
}

/**
 * Filters findings to only those that cause a review failure.
 */
export function getBlockingFindings(
  findings: ReviewFinding[],
  failOnList: Severity[]
): ReviewFinding[] {
  return findings.filter((f) => isSeverityBlocking(f.severity, failOnList));
}

/**
 * Compare two severities for sorting in descending order of severity.
 */
export function compareSeverity(a: Severity, b: Severity): number {
  return SEVERITY_ORDER[b] - SEVERITY_ORDER[a];
}
