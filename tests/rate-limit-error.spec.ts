import { test, expect } from '@playwright/test';
import {
  isRateLimitErrorMessage,
  resolveRetryDelayMs,
  shouldRetryAsRateLimit,
} from '../src/utils/rateLimitError';

test.describe('isRateLimitErrorMessage', () => {
  test('detects common rate-limit phrases case-insensitively', () => {
    expect(isRateLimitErrorMessage('API rate limit exceeded')).toBe(true);
    expect(isRateLimitErrorMessage('RateLimit reached')).toBe(true);
    expect(isRateLimitErrorMessage('Too Many Requests')).toBe(true);
    expect(isRateLimitErrorMessage('HTTP 429 from GitHub')).toBe(true);
  });

  test('rejects unrelated errors', () => {
    expect(isRateLimitErrorMessage('Not Found')).toBe(false);
    expect(isRateLimitErrorMessage('Forbidden: resource')).toBe(false);
    expect(isRateLimitErrorMessage('')).toBe(false);
  });
});

test.describe('resolveRetryDelayMs', () => {
  test('uses Retry-After seconds when finite and non-negative', () => {
    expect(resolveRetryDelayMs('5', 0, 1000)).toBe(5000);
    expect(resolveRetryDelayMs('0', 2, 1000)).toBe(0);
  });

  test('falls back to exponential backoff when header missing or invalid', () => {
    expect(resolveRetryDelayMs(null, 0, 1000)).toBe(1000);
    expect(resolveRetryDelayMs(null, 2, 1000)).toBe(4000);
    expect(resolveRetryDelayMs('', 1, 500)).toBe(1000);
    expect(resolveRetryDelayMs('not-a-number', 1, 1000)).toBe(2000);
    expect(resolveRetryDelayMs('-3', 0, 1000)).toBe(1000);
  });
});

test.describe('shouldRetryAsRateLimit', () => {
  test('retries on 429 regardless of headers', () => {
    expect(shouldRetryAsRateLimit(429, new Headers())).toBe(true);
  });

  test('retries on 403 only with rate-limit signals', () => {
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

  test('does not retry other statuses', () => {
    expect(shouldRetryAsRateLimit(401, new Headers())).toBe(false);
    expect(
      shouldRetryAsRateLimit(500, new Headers({ 'Retry-After': '1' })),
    ).toBe(false);
  });
});
