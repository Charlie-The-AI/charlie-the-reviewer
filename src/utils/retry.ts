export interface RetryOptions {
  maxRetries?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffFactor?: number;
  isRetryable?: (error: unknown) => boolean;
  onRetry?: (error: unknown, attempt: number, delayMs: number) => void;
}

export function isRetryableNetworkOrRateLimitError(error: unknown): boolean {
  if (!error) return false;

  const err = error as Record<string, unknown>;

  // Check HTTP status code
  const status =
    typeof err.status === "number"
      ? err.status
      : typeof err.statusCode === "number"
        ? err.statusCode
        : typeof (err.response as Record<string, unknown>)?.status === "number"
          ? ((err.response as Record<string, unknown>).status as number)
          : undefined;

  if (status !== undefined) {
    // 429 Too Many Requests, or 5xx Server Errors (except 501 Not Implemented)
    if (status === 429 || (status >= 500 && status <= 599 && status !== 501)) {
      return true;
    }
    // Explicitly non-retryable 4xx errors
    if (status >= 400 && status < 500) {
      return false;
    }
  }

  // Check error message/code for network or rate limit indicators
  const msg = typeof err.message === "string" ? err.message.toLowerCase() : "";
  const code = typeof err.code === "string" ? err.code.toLowerCase() : "";

  if (
    msg.includes("rate limit") ||
    msg.includes("quota exceeded") ||
    msg.includes("resource exhausted") ||
    msg.includes("too many requests") ||
    msg.includes("econnreset") ||
    msg.includes("etimedout") ||
    msg.includes("socket hang up") ||
    code === "econnreset" ||
    code === "etimedout" ||
    code === "fetch_error"
  ) {
    return true;
  }

  return false;
}

export async function withRetry<T>(fn: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const maxRetries = options.maxRetries ?? 3;
  const initialDelayMs = options.initialDelayMs ?? 1000;
  const maxDelayMs = options.maxDelayMs ?? 15000;
  const backoffFactor = options.backoffFactor ?? 2;
  const isRetryable = options.isRetryable ?? isRetryableNetworkOrRateLimitError;

  let attempt = 0;
  let currentDelay = initialDelayMs;

  while (true) {
    try {
      return await fn();
    } catch (error) {
      attempt++;
      if (attempt > maxRetries || !isRetryable(error)) {
        throw error;
      }

      // Calculate exponential backoff with full jitter
      const jitter = Math.random() * 0.4 + 0.8; // between 0.8 and 1.2
      const delayMs = Math.min(maxDelayMs, Math.round(currentDelay * jitter));

      if (options.onRetry) {
        options.onRetry(error, attempt, delayMs);
      }

      await new Promise((resolve) => setTimeout(resolve, delayMs));
      currentDelay = Math.min(maxDelayMs, currentDelay * backoffFactor);
    }
  }
}
