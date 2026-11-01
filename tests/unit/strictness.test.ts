import { describe, it, expect } from "vitest";
import { resolveFileStrictness } from "../../src/core/strictness.js";
import type { StrictnessOverride } from "../../src/types/index.js";

describe("Strictness Policy Engine", () => {
  const overrides: StrictnessOverride[] = [
    {
      paths: ["src/auth/**", "src/payments/**"],
      strictness: "maximum",
    },
    {
      paths: ["docs/**", "**/*.md"],
      strictness: "relaxed",
    },
    {
      paths: ["src/payments/legacy/**"],
      strictness: "strict",
    },
  ];

  it("returns default strictness when no overrides match", () => {
    const level = resolveFileStrictness("src/components/Button.tsx", "standard", overrides);
    expect(level).toBe("standard");
  });

  it("applies maximum strictness to matching auth path", () => {
    const level = resolveFileStrictness("src/auth/jwt.ts", "standard", overrides);
    expect(level).toBe("maximum");
  });

  it("applies relaxed strictness to markdown documentation", () => {
    const level = resolveFileStrictness("docs/architecture.md", "standard", overrides);
    expect(level).toBe("relaxed");
  });

  it("gives precedence to later matching overrides for nested subpaths", () => {
    // Matches src/payments/** first (maximum), then src/payments/legacy/** (strict)
    const level = resolveFileStrictness("src/payments/legacy/gateway.ts", "standard", overrides);
    expect(level).toBe("strict");
  });

  it("handles empty or undefined overrides safely", () => {
    expect(resolveFileStrictness("src/index.ts", "relaxed")).toBe("relaxed");
    expect(resolveFileStrictness("src/index.ts", "maximum", [])).toBe("maximum");
  });
});
