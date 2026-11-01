import micromatch from "micromatch";
import type { StrictnessLevel, StrictnessOverride } from "../types/index.js";

export const STRICTNESS_DESCRIPTIONS: Record<
  StrictnessLevel,
  { name: string; scope: string; focus: string[] }
> = {
  relaxed: {
    name: "Level 1 — Relaxed",
    scope: "Critical bugs and severe exploitable vulnerabilities",
    focus: [
      "Critical functional bugs",
      "Exploitable security vulnerabilities (e.g. SQLi, RCE, auth bypass, IDOR)",
      "Severe runtime crashes and uncaught fatal exceptions",
      "Data corruption risks",
      "Avoid stylistic, refactoring, and speculative suggestions",
    ],
  },
  standard: {
    name: "Level 2 — Standard",
    scope: "Functional correctness, stability, and runtime safety",
    focus: [
      "All checks from Relaxed",
      "Functional correctness and business logic bugs",
      "Missing error handling and unhandled promise rejections",
      "Type safety violations and unsafe casting",
      "Significant performance bottlenecks and N+1 queries",
      "API misuse and broken contract assumptions",
      "Missing input validation and sanitization",
      "Resource leaks (unclosed sockets, connections, streams)",
    ],
  },
  strict: {
    name: "Level 3 — Strict",
    scope: "Engineering craftsmanship, maintainability, and architecture",
    focus: [
      "All checks from Standard",
      "Architectural boundaries and layering violations",
      "Code maintainability and modularity",
      "Excessive code duplication",
      "Missing unit/integration test coverage for critical paths",
      "Race conditions, deadlock risks, and concurrency issues",
      "Antipatterns and poor design pattern choices",
      "Dependency management issues",
      "High cyclomatic complexity and unreadable control flow",
    ],
  },
  maximum: {
    name: "Level 4 — Maximum",
    scope: "Exhaustive defense-in-depth, reliability, and edge-case scrutiny",
    focus: [
      "All checks from Strict",
      "Comprehensive defense-in-depth security audit",
      "Detailed architectural resilience and failure recovery",
      "Transactional consistency and ACID guarantees in state changes",
      "Edge cases, boundary conditions, and nullability oddities",
      "Documentation completeness (docstrings, API contracts, READMEs)",
      "Adherence to idiomatic language/framework conventions",
      "Test quality, mock assertions, and test brittleness",
      "Backward compatibility and breaking API changes",
      "Contract consistency across distributed boundaries",
    ],
  },
};

/**
 * Resolves the effective strictness for a given file path based on default strictness
 * and path-based overrides. Later matching overrides take precedence.
 */
export function resolveFileStrictness(
  filePath: string,
  defaultStrictness: StrictnessLevel,
  overrides?: StrictnessOverride[]
): StrictnessLevel {
  if (!overrides || overrides.length === 0) {
    return defaultStrictness;
  }

  // Normalize path with forward slashes
  const normalizedPath = filePath.replace(/\\/g, "/").replace(/^\.\//, "");

  let effective = defaultStrictness;

  for (const override of overrides) {
    if (!override.paths || override.paths.length === 0) continue;
    const isMatch = micromatch.isMatch(normalizedPath, override.paths, {
      dot: true,
    });
    if (isMatch) {
      effective = override.strictness;
    }
  }

  return effective;
}
