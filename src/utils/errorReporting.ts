import * as Sentry from '@sentry/astro';

export function reportError(error: unknown, context?: Record<string, unknown>) {
  const errorObj = error instanceof Error ? error : new Error(String(error));

  Sentry.captureException(errorObj, { extra: context });
  console.error('[ErrorReporting]', errorObj, context || {});
}
