import { test, expect } from '@playwright/test';
import { executeWithRetry } from '../src/utils/retry';

test.describe('executeWithRetry', () => {
  test('should execute operation successfully without retries', async () => {
    const operation = async () => 'success';
    const result = await executeWithRetry(operation);
    expect(result).toBe('success');
  });

  test('should retry on failure and eventually succeed', async () => {
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
      initialDelayMs: 10,
      backoffFactor: 1,
    });

    expect(result).toBe('success');
    expect(attempts).toBe(3);
  });

  test('should fail after max retries', async () => {
    let attempts = 0;
    const operation = async () => {
      attempts++;
      throw new Error('fail');
    };

    const maxRetries = 3;
    await expect(
      executeWithRetry(operation, {
        maxRetries,
        initialDelayMs: 10,
        backoffFactor: 1,
      }),
    ).rejects.toThrow('fail');

    // Initial attempt (1) + maxRetries (3) = 4 total attempts
    expect(attempts).toBe(maxRetries + 1);
  });

  test('should not retry if shouldRetry returns false', async () => {
    let attempts = 0;
    const operation = async () => {
      attempts++;
      throw new Error('fatal');
    };

    await expect(
      executeWithRetry(operation, {
        maxRetries: 3,
        initialDelayMs: 10,
        // Only retry if error message is NOT 'fatal'
        shouldRetry: (err) =>
          err instanceof Error && err.message !== 'fatal',
      }),
    ).rejects.toThrow('fatal');

    // Should only run once
    expect(attempts).toBe(1);
  });

  test('should call onRetry callback', async () => {
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
      initialDelayMs: 10,
      backoffFactor: 2,
      onRetry: (attempt, delay) => {
        onRetryCalls.push(delay);
      },
    });

    // Should retry once.
    // Initial delay 10. retry 0 -> delay 10 * 2^0 = 10.
    expect(onRetryCalls.length).toBe(1);
    expect(onRetryCalls[0]).toBe(10);
  });
});
