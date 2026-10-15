import { abortableSleep, isAbortError } from './abort';

export interface RetryOptions {
  maxRetries?: number;
  initialDelayMs?: number;
  backoffFactor?: number;
  shouldRetry?: (error: unknown) => boolean;
  onRetry?: (attempt: number, delayMs: number, error: unknown) => void;
  /** Interrupts backoff sleep on cancel without waiting for the full delay. */
  signal?: AbortSignal;
}

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
