import type { ReviewResult } from "../types/index.js";

export function formatReviewResultJson(result: ReviewResult, pretty: boolean = true): string {
  return JSON.stringify(result, null, pretty ? 2 : 0);
}
