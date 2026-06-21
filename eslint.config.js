import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import relay from 'eslint-plugin-relay';
import tseslint from 'typescript-eslint';
import react from 'eslint-plugin-react';
import eslintConfigPrettier from 'eslint-config-prettier';

export default tseslint.config(
  {
    ignores: [
      'dist',
      'coverage',
      'src/queries/__generated__',
      'test-results',
      'playwright-report',
    ],
  },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
      react,
      relay,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      ...react.configs.recommended.rules,
      ...react.configs['jsx-runtime'].rules,
      // Warn-only so existing Relay-as-transport patterns don't fail CI.
      'relay/graphql-syntax': 'error',
      'relay/graphql-naming': 'warn',
      'relay/no-future-added-value': 'warn',
      'relay/unused-fields': 'warn',
      'relay/must-colocate-fragment-spreads': 'warn',
      'relay/function-required-argument': 'warn',
      'relay/hook-required-argument': 'warn',
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
  },
  eslintConfigPrettier,
);
