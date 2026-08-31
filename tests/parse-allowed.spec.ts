import { expect, test } from '@playwright/test';
import { parseAllowed } from '../src/utils/parseAllowed';

const COLORS = ['red', 'blue'] as const;
type Color = (typeof COLORS)[number];

function isColor(value: string): value is Color {
  return (COLORS as readonly string[]).includes(value);
}

test.describe('parseAllowed', () => {
  test('returns the value when it passes the type guard', () => {
    expect(parseAllowed('red', isColor, 'blue')).toBe('red');
    expect(parseAllowed('blue', isColor, 'red')).toBe('blue');
  });

  test('returns the fallback for missing or invalid values', () => {
    expect(parseAllowed(null, isColor, 'blue')).toBe('blue');
    expect(parseAllowed(undefined, isColor, 'blue')).toBe('blue');
    expect(parseAllowed('', isColor, 'blue')).toBe('blue');
    expect(parseAllowed('green', isColor, 'blue')).toBe('blue');
  });
});
