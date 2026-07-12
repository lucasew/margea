import { test, expect } from '@playwright/test';
import { parseGroupingStrategy, parsePRState } from '../src/services/urlParams';
import { GROUPING_STRATEGIES, PR_STATES } from '../src/constants';

test.describe('parsePRState', () => {
  test('defaults invalid or missing values to ALL', () => {
    expect(parsePRState(null)).toBe('ALL');
    expect(parsePRState(undefined)).toBe('ALL');
    expect(parsePRState('')).toBe('ALL');
    expect(parsePRState('nope')).toBe('ALL');
    expect(parsePRState('open')).toBe('ALL');
  });

  test('accepts known PR states', () => {
    for (const state of PR_STATES) {
      expect(parsePRState(state)).toBe(state);
    }
  });
});

test.describe('parseGroupingStrategy', () => {
  test('defaults invalid or missing values to renovate', () => {
    expect(parseGroupingStrategy(null)).toBe('renovate');
    expect(parseGroupingStrategy(undefined)).toBe('renovate');
    expect(parseGroupingStrategy('')).toBe('renovate');
    expect(parseGroupingStrategy('nope')).toBe('renovate');
    expect(parseGroupingStrategy('Renovate')).toBe('renovate');
  });

  test('accepts known grouping strategies', () => {
    for (const key of Object.keys(GROUPING_STRATEGIES)) {
      expect(parseGroupingStrategy(key)).toBe(key);
    }
  });
});
