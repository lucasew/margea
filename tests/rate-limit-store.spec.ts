import { expect, test } from '@playwright/test';
import { RateLimitStore } from '../src/services/rateLimitStore';

test.describe('RateLimitStore', () => {
  test('starts unknown (null) instead of fake 5000/5000', () => {
    const store = new RateLimitStore();
    expect(store.getState()).toEqual({
      limit: null,
      remaining: null,
      reset: null,
    });
  });

  test('update ignores missing headers', () => {
    const store = new RateLimitStore();
    store.update(null, '10', '100');
    store.update('5000', null, '100');
    store.update('5000', '10', null);
    expect(store.getState()).toEqual({
      limit: null,
      remaining: null,
      reset: null,
    });
  });

  test('update rejects non-finite parse results', () => {
    const store = new RateLimitStore();
    store.update('not-a-number', '10', '100');
    store.update('5000', 'NaN', '100');
    store.update('5000', '10', '');
    store.update('abc', 'def', 'ghi');
    expect(store.getState()).toEqual({
      limit: null,
      remaining: null,
      reset: null,
    });
  });

  test('update accepts valid headers and notifies', () => {
    const store = new RateLimitStore();
    const seen: Array<ReturnType<RateLimitStore['getState']>> = [];
    store.subscribe((s) => seen.push(s));

    store.update('5000', '4999', '1700000000');
    expect(store.getState()).toEqual({
      limit: 5000,
      remaining: 4999,
      reset: 1700000000,
    });
    expect(seen).toHaveLength(1);
    expect(seen[0]).toEqual(store.getState());
  });

  test('invalid update does not clobber known state', () => {
    const store = new RateLimitStore();
    store.update('5000', '100', '1700000000');
    store.update('nope', '100', '1700000000');
    store.update(null, null, null);
    expect(store.getState()).toEqual({
      limit: 5000,
      remaining: 100,
      reset: 1700000000,
    });
  });
});
