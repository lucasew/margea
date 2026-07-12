import * as Sentry from '@sentry/astro';

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN || import.meta.env.SENTRY_DSN,
  tracesSampleRate: 0.1,
});
