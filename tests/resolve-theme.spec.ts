import { test, expect } from '@playwright/test';
import { resolveTheme, THEME_LIGHT, THEME_DARK } from '../src/constants';

test.describe('resolveTheme', () => {
  test('null stored value falls back to prefersDark', () => {
    expect(resolveTheme(null, true)).toBe(THEME_DARK);
    expect(resolveTheme(null, false)).toBe(THEME_LIGHT);
  });

  test('migrates legacy light/dark localStorage values', () => {
    expect(resolveTheme('light', true)).toBe(THEME_LIGHT);
    expect(resolveTheme('light', false)).toBe(THEME_LIGHT);
    expect(resolveTheme('dark', true)).toBe(THEME_DARK);
    expect(resolveTheme('dark', false)).toBe(THEME_DARK);
  });

  test('keeps already-migrated theme keys', () => {
    expect(resolveTheme(THEME_LIGHT, true)).toBe(THEME_LIGHT);
    expect(resolveTheme(THEME_LIGHT, false)).toBe(THEME_LIGHT);
    expect(resolveTheme(THEME_DARK, true)).toBe(THEME_DARK);
    expect(resolveTheme(THEME_DARK, false)).toBe(THEME_DARK);
  });

  test('unknown stored string falls back to prefersDark', () => {
    expect(resolveTheme('', true)).toBe(THEME_DARK);
    expect(resolveTheme('', false)).toBe(THEME_LIGHT);
    expect(resolveTheme('cupcake', true)).toBe(THEME_DARK);
    expect(resolveTheme('cupcake', false)).toBe(THEME_LIGHT);
    expect(resolveTheme('system', true)).toBe(THEME_DARK);
    expect(resolveTheme('system', false)).toBe(THEME_LIGHT);
  });
});
