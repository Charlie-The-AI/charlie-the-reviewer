import { describe, it, expect, vi } from "vitest";
import { withRetry, isRetryableNetworkOrRateLimitError } from "../../src/utils/retry.js";

describe("Retry Mechanism & Exponential Backoff", () => {
  it("executes successfully without retrying on first attempt", async () => {
    const fn = vi.fn().mockResolvedValue("success");
    const result = await withRetry(fn, { maxRetries: 3, initialDelayMs: 10 });
    expect(result).toBe("success");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("retries on transient 429 rate limit errors and succeeds", async () => {
    let callCount = 0;
    const fn = vi.fn().mockImplementation(async () => {
      callCount++;
      if (callCount < 3) {
        const error = new Error("Rate limit exceeded") as Error & { status: number };
        error.status = 429;
        throw error;
      }
      return "recovered";
    });

    const onRetry = vi.fn();
    const result = await withRetry(fn, {
      maxRetries: 3,
      initialDelayMs: 5,
      backoffFactor: 1.5,
      onRetry,
    });

    expect(result).toBe("recovered");
    expect(fn).toHaveBeenCalledTimes(3);
    expect(onRetry).toHaveBeenCalledTimes(2);
  });

  it("does not retry on non-retryable 401 authentication errors", async () => {
    const fn = vi.fn().mockImplementation(async () => {
      const error = new Error("Invalid API key") as Error & { status: number };
      error.status = 401;
      throw error;
    });

    await expect(withRetry(fn, { maxRetries: 3, initialDelayMs: 5 })).rejects.toThrow(
      "Invalid API key"
    );

    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("classifies error status codes correctly", () => {
    expect(isRetryableNetworkOrRateLimitError({ status: 429 })).toBe(true);
    expect(isRetryableNetworkOrRateLimitError({ status: 503 })).toBe(true);
    expect(isRetryableNetworkOrRateLimitError({ status: 500 })).toBe(true);
    expect(isRetryableNetworkOrRateLimitError({ status: 400 })).toBe(false);
    expect(isRetryableNetworkOrRateLimitError({ status: 401 })).toBe(false);
    expect(isRetryableNetworkOrRateLimitError({ status: 403 })).toBe(false);
    expect(isRetryableNetworkOrRateLimitError({ message: "ECONNRESET" })).toBe(true);
  });
});
