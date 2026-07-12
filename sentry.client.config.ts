import * as Sentry from '@sentry/astro';

Sentry.init({
  dsn:
    import.meta.env.VITE_SENTRY_DSN ||
    import.meta.env.SENTRY_DSN ||
    import.meta.env.PUBLIC_SENTRY_DSN,
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration(),
  ],
  tracesSampleRate: 0.1,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 0.5,
});
