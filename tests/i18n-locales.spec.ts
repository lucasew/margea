import { test, expect } from '@playwright/test';
import en from '../src/locales/en.json' with { type: 'json' };
import es from '../src/locales/es.json' with { type: 'json' };
import pt from '../src/locales/pt.json' with { type: 'json' };

function leafKeys(obj: Record<string, unknown>, prefix = ''): string[] {
  const keys: string[] = [];
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      keys.push(...leafKeys(value as Record<string, unknown>, path));
    } else {
      keys.push(path);
    }
  }
  return keys;
}

function getByPath(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, part) => {
    if (acc && typeof acc === 'object') {
      return (acc as Record<string, unknown>)[part];
    }
    return undefined;
  }, obj);
}

const REQUIRED_UI_KEYS = [
  'footer.description',
  'footer.how_to_generate_token',
  'footer.about_renovate',
  'loginPage.subtitle',
  'loginPage.howItWorks',
  'loginPage.step1',
  'loginPage.step2',
  'loginPage.step3',
  'loginPage.step4',
  'permissions.tokenReadOnlyShort',
  'prGroupCard.base',
  'prGroupCard.prStatus',
  'prGroupCard.repos',
  'prGroupCard.open',
  'prGroupCard.merged',
  'prGroupCard.closed',
  'ci.status',
  'ci.success',
  'ci.failure',
  'ci.pending',
];

test.describe('i18n locale bundles', () => {
  test('en, es, and pt have identical top-level sections', () => {
    expect(Object.keys(es).sort()).toEqual(Object.keys(en).sort());
    expect(Object.keys(pt).sort()).toEqual(Object.keys(en).sort());
  });

  test('every required UI key exists and is non-empty in en, es, and pt', () => {
    for (const [lang, bundle] of Object.entries({ en, es, pt })) {
      for (const key of REQUIRED_UI_KEYS) {
        const value = getByPath(bundle as Record<string, unknown>, key);
        expect(
          typeof value === 'string' && value.length > 0,
          `${lang}:${key} should be a non-empty string`,
        ).toBe(true);
      }
    }
  });

  test('non-plural leaf keys in en exist in es and pt', () => {
    const enLeaves = leafKeys(en).filter(
      (k) =>
        !k.endsWith('_plural') &&
        !['selectedPRs', 'merge', 'mergeWithMethod', 'close'].some((p) =>
          k.endsWith(`.${p}`),
        ),
    );
    for (const key of enLeaves) {
      expect(getByPath(es, key), `es missing ${key}`).toBeDefined();
      expect(getByPath(pt, key), `pt missing ${key}`).toBeDefined();
    }
  });
});
