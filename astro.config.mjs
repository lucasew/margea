import { defineConfig, envField } from 'astro/config';
import react from '@astrojs/react';
import vercel from '@astrojs/vercel';
import relay from 'vite-plugin-relay';

import sentry from '@sentry/astro';

export default defineConfig({
  server: {
    port: 3000,
  },
  integrations: [react({
    babel: {
      plugins: ['babel-plugin-relay'],
    },
  }), sentry()],
  adapter: vercel(),
  output: 'server',
  env: {
    schema: {
      GITHUB_CLIENT_ID: envField.string({
        context: 'server',
        access: 'secret',
        optional: false,
      }),
      GITHUB_CLIENT_SECRET: envField.string({
        context: 'server',
        access: 'secret',
        optional: false,
      }),
      GITHUB_CALLBACK_URL: envField.string({
        context: 'server',
        access: 'secret',
        optional: false,
      }),
      SESSION_SECRET: envField.string({
        context: 'server',
        access: 'secret',
        optional: false,
      }),
    },
  },
  vite: {
    plugins: [relay],
    server: {
      port: 3000,
    },
    preview: {
      port: 3000,
    },
  },
});