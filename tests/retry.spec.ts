import { test, expect } from '@playwright/test';
import { executeWithRetry } from '../src/utils/retry';
import { isAbortError } from '../src/utils/abort';

test.describe('executeWithRetry', () => {
  test('should execute operation successfully without retries', async () => {
    await test.step('Success', async () => {
      const operation = async () => 'success';
      const result = await executeWithRetry(operation);
      expect(result).toBe('success');
    });
  });

  test('should retry on failure and eventually succeed', async () => {
    await test.step('Retry and succeed', async () => {
      let attempts = 0;
      // Succeed on 3rd attempt (after 2 failures)
      const operation = async () => {
        attempts++;
        if (attempts < 3) {
          throw new Error('fail');
        }
        return 'success';
      };

      const result = await executeWithRetry(operation, {
        maxRetries: 3,
        initialDelayMs: 50, // Increased delay to be robust
        backoffFactor: 1,
      });

      expect(result).toBe('success');
      expect(attempts).toBe(3);
    });
  });

  test('should fail after max retries', async () => {
    await test.step('Max retries exhausted', async () => {
      let attempts = 0;
      const operation = async () => {
        attempts++;
        throw new Error('fail');
      };

      const maxRetries = 3;
      await expect(
        executeWithRetry(operation, {
          maxRetries,
          initialDelayMs: 50, // Increased delay
          backoffFactor: 1,
        }),
      ).rejects.toThrow('fail');

      // Initial attempt (1) + maxRetries (3) = 4 total attempts
      expect(attempts).toBe(maxRetries + 1);
    });
  });

  test('should not retry if shouldRetry returns false', async () => {
    await test.step('Non-retriable error', async () => {
      let attempts = 0;
      const operation = async () => {
        attempts++;
        throw new Error('fatal');
      };

      await expect(
        executeWithRetry(operation, {
          maxRetries: 3,
          initialDelayMs: 50,
          // Only retry if error message is NOT 'fatal'
          shouldRetry: (err) => err instanceof Error && err.message !== 'fatal',
        }),
      ).rejects.toThrow('fatal');

      // Should only run once
      expect(attempts).toBe(1);
    });
  });

  test('should call onRetry callback', async () => {
    await test.step('Callback fired', async () => {
      let attempts = 0;
      const onRetryCalls: number[] = [];
      const operation = async () => {
        attempts++;
        if (attempts < 2) {
          throw new Error('fail');
        }
        return 'success';
      };

      await executeWithRetry(operation, {
        maxRetries: 3,
        initialDelayMs: 50,
        backoffFactor: 2,
        onRetry: (attempt, delay) => {
          onRetryCalls.push(delay);
        },
      });

      // Should retry once.
      // Initial delay 50. retry 0 -> delay 50 * 2^0 = 50.
      expect(onRetryCalls.length).toBe(1);
      expect(onRetryCalls[0]).toBe(50);
    });
  });

  test('should abort during backoff when signal is aborted', async () => {
    await test.step('Abort interrupts sleep', async () => {
      let attempts = 0;
      const controller = new AbortController();
      const operation = async () => {
        attempts++;
        throw new Error('fail');
      };

      const started = Date.now();
      // Abort shortly after first failure enters a long backoff
      const abortTimer = setTimeout(() => controller.abort(), 40);
      let caught: unknown;
      try {
        await executeWithRetry(operation, {
          maxRetries: 5,
          initialDelayMs: 10_000,
          backoffFactor: 1,
          signal: controller.signal,
        });
        throw new Error('expected executeWithRetry to reject');
      } catch (err) {
        caught = err;
      } finally {
        clearTimeout(abortTimer);
      }

      expect(isAbortError(caught)).toBe(true);
      expect(attempts).toBe(1);
      // Must not wait for the full 10s backoff
      expect(Date.now() - started).toBeLessThan(2000);
    });
  });

  test('should not retry when operation throws AbortError', async () => {
    await test.step('AbortError is terminal', async () => {
      let attempts = 0;
      const operation = async () => {
        attempts++;
        const err = new Error('Aborted');
        err.name = 'AbortError';
        throw err;
      };

      let caught: unknown;
      try {
        await executeWithRetry(operation, {
          maxRetries: 3,
          initialDelayMs: 50,
        });
        throw new Error('expected executeWithRetry to reject');
      } catch (err) {
        caught = err;
      }

      expect(isAbortError(caught)).toBe(true);
      expect(attempts).toBe(1);
    });
  });
});
