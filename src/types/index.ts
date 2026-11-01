/**
 * Core type definitions for @thesonofman/charlie-the-reviewer
 */

export type Severity = "critical" | "high" | "medium" | "low";

export type StrictnessLevel = "relaxed" | "standard" | "strict" | "maximum";

export type ReviewStatus = "passed" | "failed" | "incomplete" | "skipped";

export interface CustomRule {
  id: string;
  description: string;
  severity: Severity;
  paths?: string[];
  enabled?: boolean;
}

export interface StrictnessOverride {
  paths: string[];
  strictness: StrictnessLevel;
}

export interface DiffLine {
  type: "add" | "del" | "normal";
  oldLineNumber?: number;
  newLineNumber?: number;
  content: string;
}

export interface DiffHunk {
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  lines: DiffLine[];
}

export interface ChangedFile {
  filename: string;
  oldFilename?: string;
  status: "added" | "modified" | "deleted" | "renamed";
  additions: number;
  deletions: number;
  patch: string;
  hunks: DiffHunk[];
  addedLineNumbers: number[];
  modifiedLineNumbers: number[];
  isBinary: boolean;
  isTruncated?: boolean;
}

export interface FileContext {
  path: string;
  content: string;
  reason: "adjacent" | "import" | "test" | "type_definition";
}

export interface ChangedFileReviewPayload {
  filename: string;
  status: "added" | "modified" | "deleted" | "renamed";
  patch: string;
  strictness: StrictnessLevel;
  applicableRules: CustomRule[];
  context?: FileContext[];
}

export interface ReviewFinding {
  id: string;
  file: string;
  line: number;
  endLine?: number;
  severity: Severity;
  category: string;
  title: string;
  description: string;
  suggestion?: string;
  confidence: number;
  ruleId?: string;
}

export interface TokenUsage {
  inputTokens?: number;
  outputTokens?: number;
  estimatedCost?: number;
}

export interface ReviewResult {
  summary: string;
  findings: ReviewFinding[];
  reviewedFiles: string[];
  skippedFiles: string[];
  provider: string;
  model: string;
  durationMs: number;
  status: ReviewStatus;
  blockingFindings: ReviewFinding[];
  usage?: TokenUsage;
  metadata?: {
    effectiveStrictness?: Record<string, StrictnessLevel>;
    fallbackUsed?: boolean;
    initialProvider?: string;
    totalFiles?: number;
    error?: string;
  };
}

export interface AIReviewRequest {
  files: ChangedFileReviewPayload[];
  defaultStrictness: StrictnessLevel;
  customRules: CustomRule[];
  options?: {
    temperature?: number;
    maxTokens?: number;
  };
}

export interface AIReviewResponse {
  findings: ReviewFinding[];
  summary: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
  rawResponse?: unknown;
}

export interface AIProvider {
  readonly name: string;
  review(request: AIReviewRequest): Promise<AIReviewResponse>;
  validateConfiguration(): Promise<void>;
}

export interface ProviderModelPricing {
  inputPerMillion: number;
  outputPerMillion: number;
}

export interface ReviewConfig {
  ai: {
    provider: "openai" | "gemini" | string;
    model: string;
    temperature?: number;
    max_output_tokens?: number;
    fallback?: {
      enabled: boolean;
      provider: string;
      model: string;
    };
    models?: Partial<Record<StrictnessLevel, string>>;
  };
  review: {
    strictness: StrictnessLevel;
    fail_on: Severity[];
    minimum_confidence: number;
    max_comments: number;
    noise_reduction: {
      enabled: boolean;
      deduplicate: boolean;
    };
    overrides?: StrictnessOverride[];
    custom_rules?: CustomRule[];
    enforcement: {
      enabled: boolean;
      mode: "status_check" | "exit_code";
    };
  };
  limits: {
    max_files: number;
    max_diff_lines: number;
    max_input_tokens: number;
    max_output_tokens: number;
    max_concurrent_requests: number;
    timeout_seconds: number;
  };
  ignore: string[];
}
