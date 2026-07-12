/** True when an error string looks like a GitHub API rate-limit response. */
export function isRateLimitErrorMessage(message: string): boolean {
  const msg = message.toLowerCase();
  return (
    msg.includes('rate limit') ||
    msg.includes('ratelimit') ||
    msg.includes('too many requests') ||
    msg.includes('429')
  );
}

/**
 * Delay for the next retry: use Retry-After (seconds) when finite and non-negative;
 * otherwise exponential backoff from baseDelayMs.
 */
export function resolveRetryDelayMs(
  retryAfterHeader: string | null,
  attempt: number,
  baseDelayMs: number,
): number {
  if (retryAfterHeader != null && retryAfterHeader !== '') {
    const seconds = parseInt(retryAfterHeader, 10);
    if (Number.isFinite(seconds) && seconds >= 0) {
      return seconds * 1000;
    }
  }
  return baseDelayMs * Math.pow(2, attempt);
}

/**
 * Whether this HTTP status/headers should trigger a rate-limit retry.
 * 429 always; 403 only when rate-limit signals are present (not permission denials).
 */
export function shouldRetryAsRateLimit(
  status: number,
  headers: Headers,
): boolean {
  if (status === 429) return true;
  if (status !== 403) return false;
  if (headers.get('Retry-After')) return true;
  return headers.get('X-RateLimit-Remaining') === '0';
}
