import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { resolveConfiguration, validateConfigurationObject } from "../../src/config/loader.js";
import { DEFAULT_CONFIG } from "../../src/config/defaults.js";

describe("Configuration Loader & Validation", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("loads default configuration when no file or overrides provided", () => {
    const config = resolveConfiguration();
    expect(config.ai.provider).toBe("openai");
    expect(config.ai.model).toBe("gpt-4o");
    expect(config.review.strictness).toBe("standard");
    expect(config.review.fail_on).toEqual(["critical", "high"]);
    expect(config.limits.max_files).toBe(50);
  });

  it("applies environment variable overrides correctly", () => {
    process.env.AI_REVIEW_PROVIDER = "gemini";
    process.env.AI_REVIEW_MODEL = "gemini-2.5-flash";
    process.env.AI_REVIEW_STRICTNESS = "maximum";

    const config = resolveConfiguration();
    expect(config.ai.provider).toBe("gemini");
    expect(config.ai.model).toBe("gemini-2.5-flash");
    expect(config.review.strictness).toBe("maximum");
  });

  it("applies programmatic overrides correctly", () => {
    const config = resolveConfiguration({
      overrides: {
        ai: {
          provider: "gemini",
          model: "gemini-2.5-pro",
        },
        review: {
          strictness: "strict",
          fail_on: ["critical"],
          minimum_confidence: 0.9,
          max_comments: 10,
          noise_reduction: { enabled: true, deduplicate: true },
          enforcement: { enabled: true, mode: "exit_code" },
        },
      },
    });

    expect(config.ai.provider).toBe("gemini");
    expect(config.ai.model).toBe("gemini-2.5-pro");
    expect(config.review.strictness).toBe("strict");
    expect(config.review.fail_on).toEqual(["critical"]);
    expect(config.review.minimum_confidence).toBe(0.9);
    expect(config.review.max_comments).toBe(10);
  });

  it("validates configuration objects and reports schema errors", () => {
    const invalidConfig = {
      ai: {
        provider: "",
        model: "",
        temperature: 5.0, // invalid temperature > 2
      },
      review: {
        strictness: "invalid_level",
        fail_on: ["ultra_critical"], // invalid severity
      },
    };

    const result = validateConfigurationObject(invalidConfig);
    expect(result.success).toBe(false);
    expect(result.errors?.length).toBeGreaterThan(0);
  });

  it("validates custom rules schema successfully", () => {
    const validConfig = {
      ...DEFAULT_CONFIG,
      review: {
        ...DEFAULT_CONFIG.review,
        custom_rules: [
          {
            id: "no-eval",
            description: "Avoid eval in JavaScript",
            severity: "critical" as const,
            paths: ["src/**/*.js", "src/**/*.ts"],
            enabled: true,
          },
        ],
      },
    };

    const result = validateConfigurationObject(validConfig);
    expect(result.success).toBe(true);
    expect(result.data?.review.custom_rules[0]?.id).toBe("no-eval");
  });
});
