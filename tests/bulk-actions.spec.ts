import { test, expect } from '@playwright/test';
import {
  isRateLimitErrorMessage,
  resolveRetryDelayMs,
  shouldRetryAsRateLimit,
} from '../src/utils/rateLimitError';

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

test.describe('resolveRetryDelayMs', () => {
  const base = 1000;

  test('uses finite non-negative Retry-After in seconds', () => {
    expect(resolveRetryDelayMs('5', 0, base)).toBe(5000);
    expect(resolveRetryDelayMs('0', 2, base)).toBe(0);
  });

  test('falls back to exponential backoff when Retry-After is missing or invalid', () => {
    expect(resolveRetryDelayMs(null, 0, base)).toBe(1000);
    expect(resolveRetryDelayMs(null, 2, base)).toBe(4000);
    expect(resolveRetryDelayMs('', 1, base)).toBe(2000);
    expect(resolveRetryDelayMs('not-a-number', 1, base)).toBe(2000);
    expect(resolveRetryDelayMs('-3', 0, base)).toBe(1000);
  });
});

test.describe('shouldRetryAsRateLimit', () => {
  test('always retries 429', () => {
    expect(shouldRetryAsRateLimit(429, new Headers())).toBe(true);
  });

  test('retries 403 only with rate-limit headers', () => {
    expect(shouldRetryAsRateLimit(403, new Headers())).toBe(false);
    expect(
      shouldRetryAsRateLimit(403, new Headers({ 'Retry-After': '10' })),
    ).toBe(true);
    expect(
      shouldRetryAsRateLimit(
        403,
        new Headers({ 'X-RateLimit-Remaining': '0' }),
      ),
    ).toBe(true);
    expect(
      shouldRetryAsRateLimit(
        403,
        new Headers({ 'X-RateLimit-Remaining': '5' }),
      ),
    ).toBe(false);
  });

  test('does not treat other statuses as rate limits', () => {
    expect(shouldRetryAsRateLimit(401, new Headers())).toBe(false);
    expect(
      shouldRetryAsRateLimit(500, new Headers({ 'Retry-After': '1' })),
    ).toBe(false);
  });
});
