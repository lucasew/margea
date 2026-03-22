/**
 * Centralized error reporting utility.
 * All unexpected errors should be funneled through this function instead of calling console.error directly.
 * In the future, this can be easily connected to Sentry, LogRocket, or other error tracking services.
 */

interface ErrorReportContext {
  [key: string]: unknown;
}

export function reportError(
  error: unknown,
  context?: ErrorReportContext,
): void {
  // If we had Sentry, we would do something like Sentry.captureException(error, { extra: context }) here.

  // For now, log to console with contextual information
  if (context && Object.keys(context).length > 0) {
    console.error('An error occurred:', error, 'Context:', context);
  } else {
    console.error('An error occurred:', error);
  }
}
