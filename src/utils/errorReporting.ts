/**
 * Centralized error reporting function.
 *
 * All unexpected errors must be funneled through this function instead of calling
 * console.error directly. This allows us to easily add an error tracking service
 * like Sentry in the future, as well as providing consistent error logging.
 *
 * @param error The error object or message to report.
 * @param context Additional context or metadata about the error.
 */
export function reportError(
  error: unknown,
  context?: Record<string, unknown>,
): void {
  if (context) {
    console.error(error, context);
  } else {
    console.error(error);
  }
}
