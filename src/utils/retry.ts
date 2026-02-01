/**
 * Options for the retry mechanism.
 */
export interface RetryOptions {
  /** Maximum number of retries to attempt. Default is 5. */
  maxRetries?: number;
  /** Base delay in milliseconds for the exponential backoff. Default is 1000ms. */
  baseDelay?: number;
  /**
   * Predicate to determine if an error should trigger a retry.
   * If not provided, all errors trigger a retry.
   */
  shouldRetry?: (error: unknown) => boolean;
  /**
   * Callback invoked before waiting for the next retry.
   * Useful for logging or updating UI status.
   */
  onRetry?: (attempt: number, error: unknown, delay: number) => void;
}

/**
 * Executes an asynchronous operation with exponential backoff retry logic.
 *
 * @param operation - The async function to execute.
 * @param options - Configuration options for retries.
 * @returns The result of the operation.
 * @throws The last error encountered if all retries fail.
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const { maxRetries = 5, baseDelay = 1000, shouldRetry } = options;
  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      if (attempt === maxRetries) {
        break;
      }

      if (shouldRetry && !shouldRetry(error)) {
        throw error;
      }

      const delay = Math.pow(2, attempt + 1) * baseDelay;

      if (options.onRetry) {
        options.onRetry(attempt + 1, error, delay);
      }

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}
