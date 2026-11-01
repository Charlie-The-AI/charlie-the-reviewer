import { z } from "zod";

export const SeveritySchema = z.enum(["critical", "high", "medium", "low"]);

export const StrictnessLevelSchema = z.enum(["relaxed", "standard", "strict", "maximum"]);

export const CustomRuleSchema = z.object({
  id: z
    .string()
    .min(1, "Rule ID must not be empty")
    .regex(/^[a-z0-9_-]+$/i, "Rule ID must be alphanumeric and may include underscores or hyphens"),
  description: z.string().min(1, "Rule description must not be empty"),
  severity: SeveritySchema,
  paths: z.array(z.string()).optional(),
  enabled: z.boolean().default(true),
});

export const StrictnessOverrideSchema = z.object({
  paths: z.array(z.string()).min(1, "At least one path glob must be specified"),
  strictness: StrictnessLevelSchema,
});

export const AIConfigSchema = z.object({
  provider: z.string().min(1, "Provider name must not be empty"),
  model: z.string().min(1, "Model name must not be empty"),
  temperature: z.number().min(0).max(2).default(0.1),
  max_output_tokens: z.number().positive().default(4000),
  fallback: z
    .object({
      enabled: z.boolean().default(false),
      provider: z.string().min(1, "Fallback provider must not be empty"),
      model: z.string().min(1, "Fallback model must not be empty"),
    })
    .optional(),
  models: z
    .object({
      relaxed: z.string().optional(),
      standard: z.string().optional(),
      strict: z.string().optional(),
      maximum: z.string().optional(),
    })
    .optional(),
});

export const ReviewPolicyConfigSchema = z.object({
  strictness: StrictnessLevelSchema.default("standard"),
  fail_on: z.array(SeveritySchema).default(["critical", "high"]),
  minimum_confidence: z.number().min(0).max(1).default(0.75),
  max_comments: z.number().positive().default(25),
  noise_reduction: z
    .object({
      enabled: z.boolean().default(true),
      deduplicate: z.boolean().default(true),
    })
    .default({ enabled: true, deduplicate: true }),
  overrides: z.array(StrictnessOverrideSchema).default([]),
  custom_rules: z.array(CustomRuleSchema).default([]),
  enforcement: z
    .object({
      enabled: z.boolean().default(true),
      mode: z.enum(["status_check", "exit_code"]).default("status_check"),
    })
    .default({ enabled: true, mode: "status_check" }),
});

export const LimitsConfigSchema = z.object({
  max_files: z.number().positive().default(50),
  max_diff_lines: z.number().positive().default(3000),
  max_input_tokens: z.number().positive().default(60000),
  max_output_tokens: z.number().positive().default(4000),
  max_concurrent_requests: z.number().positive().default(3),
  timeout_seconds: z.number().positive().default(120),
});

export const ReviewConfigSchema = z.object({
  ai: AIConfigSchema,
  review: ReviewPolicyConfigSchema.default({}),
  limits: LimitsConfigSchema.default({}),
  ignore: z
    .array(z.string())
    .default([
      "**/*.min.js",
      "**/*.min.css",
      "**/*.map",
      "**/package-lock.json",
      "**/pnpm-lock.yaml",
      "**/yarn.lock",
      "**/composer.lock",
      "**/Gemfile.lock",
      "**/go.sum",
      "**/Cargo.lock",
      "**/dist/**",
      "**/build/**",
      "**/.git/**",
      "**/*.png",
      "**/*.jpg",
      "**/*.jpeg",
      "**/*.gif",
      "**/*.svg",
      "**/*.ico",
      "**/*.pdf",
      "**/*.woff",
      "**/*.woff2",
      "**/*.ttf",
      "**/*.eot",
    ]),
});

export type ValidatedConfig = z.infer<typeof ReviewConfigSchema>;
