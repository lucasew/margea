/**
 * Executes an operation with exponential backoff retry logic.
 *
 * This utility implements the "Retry with Exponential Backoff" pattern,
 * allowing transient failures (like rate limits) to be handled gracefully.
 *
 * @param operation - The async operation to execute.
 * @param shouldRetry - Predicate to determine if a result indicates a transient failure that should be retried.
 * @param onRetry - Callback invoked before waiting for the next attempt.
 * @param maxRetries - Maximum number of retries (default: 5).
 * @returns The result of the operation.
 */
export async function executeWithRetry<T>(
  operation: () => Promise<T>,
  shouldRetry: (result: T) => boolean,
  onRetry: (attempt: number, delayMs: number) => void,
  maxRetries: number = 5,
): Promise<T> {
  let retryCount = 0;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const result = await operation();

    if (!shouldRetry(result) || retryCount >= maxRetries) {
      return result;
    }

    // Exponential backoff: 2s, 4s, 8s...
    // Matches logic: Math.pow(2, retryCount + 1) * 1000
    const delayMs = Math.pow(2, retryCount + 1) * 1000;
    retryCount++;

    onRetry(retryCount, delayMs);

    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
}
