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
