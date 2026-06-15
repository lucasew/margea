import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import vercel from '@astrojs/vercel';
import relay from 'vite-plugin-relay';

export default defineConfig({
  integrations: [
    react({
      babel: {
        plugins: ['babel-plugin-relay'],
      },
    }),
  ],
  adapter: vercel(),
  output: 'server',
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
