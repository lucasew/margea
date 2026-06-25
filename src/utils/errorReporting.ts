export function reportError(error: unknown, context?: Record<string, unknown>) {
  // If we had Sentry, we'd do Sentry.captureException(error, { extra: context }) here
  // For now, log to console to satisfy the rule and ensure errors are visible
  const errorObj = error instanceof Error ? error : new Error(String(error));

  console.error('[ErrorReporting]', errorObj, context || {});
}
