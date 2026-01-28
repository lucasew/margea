/**
 * Options for the retry logic.
 */
export interface RetryOptions<T> {
  /**
   * Maximum number of retries. Defaults to 5.
   */
  maxRetries?: number;
  /**
   * Base delay in milliseconds for exponential backoff. Defaults to 1000.
   */
  baseDelay?: number;
  /**
   * Predicate to determine if the operation should be retried based on the result.
   */
  shouldRetry?: (result: T) => boolean;
  /**
   * Callback executed before waiting for the next retry.
   */
  onRetry?: (attempt: number, delay: number, result: T) => void;
}

/**
 * Executes an operation with exponential backoff retry logic.
 *
 * This function is designed to handle operations that might fail transiently,
 * such as network requests subject to rate limiting.
 *
 * @param operation - The async operation to execute.
 * @param options - Configuration for retries.
 * @returns The final result of the operation.
 */
export async function retryOperation<T>(
  operation: () => Promise<T>,
  options: RetryOptions<T> = {}
): Promise<T> {
  const {
    maxRetries = 5,
    baseDelay = 1000,
    shouldRetry,
    onRetry,
  } = options;

  let attempt = 0;

  while (true) {
    const result = await operation();

    // If no retry condition is met, return immediately
    if (!shouldRetry || !shouldRetry(result)) {
      return result;
    }

    // Check if we exceeded max retries
    if (attempt >= maxRetries) {
      return result;
    }

    // Calculate delay: 2^(attempt+1) * baseDelay
    // attempt 0: 2^1 * 1000 = 2000ms
    const delay = Math.pow(2, attempt + 1) * baseDelay;

    if (onRetry) {
      onRetry(attempt + 1, delay, result);
    }

    await new Promise((resolve) => setTimeout(resolve, delay));
    attempt++;
  }
}
