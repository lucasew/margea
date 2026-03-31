export function reportError(error: unknown, context?: Record<string, unknown>) {
  // Centralized Error Reporting Mechanism.
  // In the future, this can be integrated with external services like Sentry.
  console.error('[ErrorReporting]', error, context);
}
