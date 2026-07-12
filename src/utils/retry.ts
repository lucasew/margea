import { abortableSleep, isAbortError } from './abort';

/**
 * Configuration options for the retry mechanism.
 */
export interface RetryOptions {
  /** Maximum number of retry attempts. Default: 5 */
  maxRetries?: number;
  /** Initial delay in milliseconds. Default: 1000 */
  initialDelayMs?: number;
  /** Backoff factor. Default: 2 */
  backoffFactor?: number;
  /**
   * Predicate to determine if an error should trigger a retry.
   * If not provided, all errors are considered retriable.
   */
  shouldRetry?: (error: unknown) => boolean;
  /**
   * Callback executed before waiting for the next retry.
   * Useful for logging or updating UI state.
   */
  onRetry?: (attempt: number, delayMs: number, error: unknown) => void;
  /**
   * When provided, backoff sleeps respect this signal so cancel can
   * interrupt retries without waiting for the full delay.
   */
  signal?: AbortSignal;
}

/**
 * Executes an asynchronous operation with exponential backoff retry logic.
 *
 * @param operation - The async function to execute.
 * @param options - Retry configuration options.
 * @returns The result of the operation.
 * @throws The last error encountered if all retries fail.
 */
export async function executeWithRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const {
    maxRetries = 5,
    initialDelayMs = 1000,
    backoffFactor = 2,
    shouldRetry = () => true,
    onRetry,
    signal,
  } = options;

  let retries = 0;

  while (true) {
    try {
      return await operation();
    } catch (error) {
      if (isAbortError(error) || retries >= maxRetries || !shouldRetry(error)) {
        throw error;
      }

      const delayMs = initialDelayMs * Math.pow(backoffFactor, retries);
      retries++;

      if (onRetry) {
        onRetry(retries, delayMs, error);
      }

      await abortableSleep(delayMs, signal);
    }
  }
}
