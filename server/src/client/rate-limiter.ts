/**
 * Utility functions for Rate Limiting, Delay, and Chunking to protect Notion API
 */

export const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Splits an array into chunks of specified size (Notion API max is 100 blocks per request)
 */
export function chunkArray<T>(items: T[], chunkSize: number = 100): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += chunkSize) {
    chunks.push(items.slice(i, i + chunkSize));
  }
  return chunks;
}

/**
 * Execute an async function with Exponential Backoff retry
 * specifically for Notion API 429 (Rate Limit) and Connection Reset errors.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 5,
  initialDelayMs: number = 1000
): Promise<T> {
  let attempt = 0;
  let currentDelay = initialDelayMs;

  while (true) {
    try {
      return await fn();
    } catch (error: any) {
      attempt++;
      const status = error?.status || error?.response?.status;
      const code = error?.code || error?.cause?.code;

      const isRateLimit = status === 429;
      const isConnectionReset =
        code === "ECONNRESET" ||
        code === "ETIMEDOUT" ||
        code === "EPIPE" ||
        error?.message?.includes("ConnectionResetError") ||
        error?.message?.includes("socket hang up");

      if ((isRateLimit || isConnectionReset) && attempt <= maxRetries) {
        // If Notion provides a 'Retry-After' header, honor it
        const retryAfter =
          error?.headers?.["retry-after"] ||
          error?.response?.headers?.["retry-after"];
        const waitTime = retryAfter ? parseInt(retryAfter, 10) * 1000 : currentDelay;

        console.error(
          `[RateLimit/Retry] Attempt ${attempt}/${maxRetries} failed with ${
            isRateLimit ? "429 Rate Limit" : code || "Connection Reset"
          }. Retrying in ${waitTime}ms...`
        );

        await delay(waitTime);
        currentDelay = Math.min(currentDelay * 2, 10000); // Cap backoff at 10s
        continue;
      }

      throw error;
    }
  }
}
