import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import YAML from "yaml";
import { DEFAULT_CONFIG, DEFAULT_CONFIG_FILENAMES } from "./defaults.js";
import { ReviewConfigSchema, type ValidatedConfig } from "./schema.js";
import type { ReviewConfig, StrictnessLevel } from "../types/index.js";

export interface LoadConfigOptions {
  configPath?: string;
  cwd?: string;
  overrides?: Partial<ReviewConfig>;
}

export function findConfigFile(cwd: string = process.cwd()): string | null {
  for (const filename of DEFAULT_CONFIG_FILENAMES) {
    const fullPath = resolve(cwd, filename);
    if (existsSync(fullPath)) {
      return fullPath;
    }
  }
  return null;
}

export function loadConfigFile(filePath: string): unknown {
  try {
    const rawContent = readFileSync(filePath, "utf-8");
    return YAML.parse(rawContent);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to parse configuration file at "${filePath}": ${message}`);
  }
}

export function applyEnvOverrides(rawConfig: Record<string, unknown>): Record<string, unknown> {
  const config = { ...rawConfig };
  const ai = { ...((config.ai as Record<string, unknown>) || {}) };
  const review = { ...((config.review as Record<string, unknown>) || {}) };

  const envProvider = process.env.AI_REVIEW_PROVIDER;
  if (envProvider) {
    ai.provider = envProvider.trim().toLowerCase();
  }

  const envModel = process.env.AI_REVIEW_MODEL;
  if (envModel) {
    ai.model = envModel.trim();
  }

  const envStrictness = process.env.AI_REVIEW_STRICTNESS;
  if (envStrictness) {
    review.strictness = envStrictness.trim().toLowerCase() as StrictnessLevel;
  }

  config.ai = ai;
  config.review = review;
  return config;
}

export function mergeDeep<T extends Record<string, unknown>>(
  target: T,
  source: Record<string, unknown>
): T {
  const result: Record<string, unknown> = { ...target };

  for (const [key, value] of Object.entries(source)) {
    if (value === undefined || value === null) {
      continue;
    }

    if (
      typeof value === "object" &&
      !Array.isArray(value) &&
      typeof result[key] === "object" &&
      !Array.isArray(result[key]) &&
      result[key] !== null
    ) {
      result[key] = mergeDeep(
        result[key] as Record<string, unknown>,
        value as Record<string, unknown>
      );
    } else {
      result[key] = value;
    }
  }

  return result as T;
}

export function resolveConfiguration(options: LoadConfigOptions = {}): ReviewConfig {
  const cwd = options.cwd || process.cwd();
  let parsedFileConfig: Record<string, unknown> = {};

  if (options.configPath) {
    const resolvedPath = resolve(cwd, options.configPath);
    if (!existsSync(resolvedPath)) {
      throw new Error(`Specified configuration file does not exist: "${resolvedPath}"`);
    }
    parsedFileConfig = (loadConfigFile(resolvedPath) as Record<string, unknown>) || {};
  } else {
    const discovered = findConfigFile(cwd);
    if (discovered) {
      parsedFileConfig = (loadConfigFile(discovered) as Record<string, unknown>) || {};
    }
  }

  // Merge default config with file config
  let merged = mergeDeep(DEFAULT_CONFIG as unknown as Record<string, unknown>, parsedFileConfig);

  // Apply environment variable overrides
  merged = applyEnvOverrides(merged);

  // Apply programmatic overrides if provided
  if (options.overrides) {
    merged = mergeDeep(merged, options.overrides as Record<string, unknown>);
  }

  // Validate with Zod
  const validationResult = ReviewConfigSchema.safeParse(merged);

  if (!validationResult.success) {
    const errorDetails = validationResult.error.issues
      .map((issue) => ` - [${issue.path.join(".")}]: ${issue.message}`)
      .join("\n");
    throw new Error(`Configuration validation failed:\n${errorDetails}`);
  }

  return validationResult.data as unknown as ReviewConfig;
}

export function validateConfigurationObject(config: unknown): {
  success: boolean;
  data?: ValidatedConfig;
  errors?: string[];
} {
  const parsed = ReviewConfigSchema.safeParse(config);
  if (parsed.success) {
    return { success: true, data: parsed.data };
  }
  return {
    success: false,
    errors: parsed.error.issues.map((i) => `[${i.path.join(".")}]: ${i.message}`),
  };
}
