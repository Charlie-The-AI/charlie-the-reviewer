import { describe, it, expect } from "vitest";
import {
  compareSeverity,
  isSeverityBlocking,
  getBlockingFindings,
} from "../../src/core/severity.js";
import type { ReviewFinding, Severity } from "../../src/types/index.js";

describe("Severity Evaluation", () => {
  const sampleFindings: ReviewFinding[] = [
    {
      id: "f1",
      file: "src/auth.ts",
      line: 10,
      severity: "critical",
      category: "security",
      title: "Hardcoded secret",
      description: "Secret key exposed",
      confidence: 0.99,
    },
    {
      id: "f2",
      file: "src/api.ts",
      line: 25,
      severity: "high",
      category: "bug",
      title: "Missing input validation",
      description: "Missing body checks",
      confidence: 0.85,
    },
    {
      id: "f3",
      file: "src/utils.ts",
      line: 5,
      severity: "medium",
      category: "performance",
      title: "Inefficient loop",
      description: "Quadratic time complexity",
      confidence: 0.8,
    },
    {
      id: "f4",
      file: "src/types.ts",
      line: 1,
      severity: "low",
      category: "style",
      title: "Naming convention",
      description: "Use PascalCase for types",
      confidence: 0.7,
    },
  ];

  it("identifies blocking severities according to fail_on list", () => {
    const failOn: Severity[] = ["critical", "high"];
    expect(isSeverityBlocking("critical", failOn)).toBe(true);
    expect(isSeverityBlocking("high", failOn)).toBe(true);
    expect(isSeverityBlocking("medium", failOn)).toBe(false);
    expect(isSeverityBlocking("low", failOn)).toBe(false);
  });

  it("filters findings to only blocking findings", () => {
    const failOn: Severity[] = ["critical", "high"];
    const blocking = getBlockingFindings(sampleFindings, failOn);
    expect(blocking.map((b) => b.id)).toEqual(["f1", "f2"]);
  });

  it("correctly sorts severities in descending order", () => {
    const sorted = [...sampleFindings].sort((a, b) => compareSeverity(a.severity, b.severity));
    expect(sorted.map((s) => s.severity)).toEqual(["critical", "high", "medium", "low"]);
  });
});
