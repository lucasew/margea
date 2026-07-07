import { test, expect } from '@playwright/test';
import { isRateLimitErrorMessage } from '../src/utils/rateLimitError';

test.describe('isRateLimitErrorMessage', () => {
  test('matches common GitHub rate-limit error strings', () => {
    expect(isRateLimitErrorMessage('API rate limit exceeded')).toBe(true);
    expect(isRateLimitErrorMessage('RateLimit reached')).toBe(true);
    expect(isRateLimitErrorMessage('Too Many Requests')).toBe(true);
    expect(isRateLimitErrorMessage('HTTP 429 from upstream')).toBe(true);
  });

  test('rejects unrelated errors', () => {
    expect(isRateLimitErrorMessage('Pull request is not mergeable')).toBe(
      false,
    );
    expect(isRateLimitErrorMessage('Network error')).toBe(false);
    expect(isRateLimitErrorMessage('')).toBe(false);
  });
});
