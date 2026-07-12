import { test, expect } from '@playwright/test';
import {
  isMergeMethod,
  parseMergeMethod,
  readStoredMergeMethod,
  storeMergeMethod,
} from '../src/services/mergeMethod';
import {
  DEFAULT_MERGE_METHOD,
  MERGE_METHODS,
  MERGE_METHOD_STORAGE_KEY,
} from '../src/constants';

/** Minimal sessionStorage for unit-testing outside the browser. */
function installMemorySessionStorage(options?: {
  getItem?: (key: string) => string | null;
  setItem?: (key: string, value: string) => void;
}): () => void {
  const store = new Map<string, string>();
  const previous = globalThis.sessionStorage;
  const memoryStorage: Storage = {
    get length() {
      return store.size;
    },
    clear() {
      store.clear();
    },
    getItem(key: string) {
      if (options?.getItem) return options.getItem(key);
      return store.has(key) ? store.get(key)! : null;
    },
    key(index: number) {
      return [...store.keys()][index] ?? null;
    },
    removeItem(key: string) {
      store.delete(key);
    },
    setItem(key: string, value: string) {
      if (options?.setItem) {
        options.setItem(key, value);
        return;
      }
      store.set(key, value);
    },
  };
  Object.defineProperty(globalThis, 'sessionStorage', {
    configurable: true,
    value: memoryStorage,
  });
  return () => {
    Object.defineProperty(globalThis, 'sessionStorage', {
      configurable: true,
      value: previous,
    });
  };
}

test.describe('isMergeMethod', () => {
  test('accepts known merge methods', () => {
    for (const method of MERGE_METHODS) {
      expect(isMergeMethod(method)).toBe(true);
    }
  });

  test('rejects invalid values', () => {
    expect(isMergeMethod('')).toBe(false);
    expect(isMergeMethod('nope')).toBe(false);
    expect(isMergeMethod('merge')).toBe(false);
    expect(isMergeMethod('Merge')).toBe(false);
    expect(isMergeMethod('SQUASH ')).toBe(false);
    expect(isMergeMethod(' MERGE')).toBe(false);
  });
});

test.describe('parseMergeMethod', () => {
  test('returns the value when it is a known merge method', () => {
    for (const method of MERGE_METHODS) {
      expect(parseMergeMethod(method)).toBe(method);
    }
  });

  test('defaults invalid or missing values to DEFAULT_MERGE_METHOD', () => {
    expect(parseMergeMethod(null)).toBe(DEFAULT_MERGE_METHOD);
    expect(parseMergeMethod(undefined)).toBe(DEFAULT_MERGE_METHOD);
    expect(parseMergeMethod('')).toBe(DEFAULT_MERGE_METHOD);
    expect(parseMergeMethod('nope')).toBe(DEFAULT_MERGE_METHOD);
    expect(parseMergeMethod('merge')).toBe(DEFAULT_MERGE_METHOD);
    expect(parseMergeMethod('SQUASH ')).toBe(DEFAULT_MERGE_METHOD);
    expect(DEFAULT_MERGE_METHOD).toBe('MERGE');
  });
});

test.describe('readStoredMergeMethod', () => {
  test('returns default when nothing is stored', () => {
    const restore = installMemorySessionStorage();
    try {
      expect(readStoredMergeMethod()).toBe(DEFAULT_MERGE_METHOD);
    } finally {
      restore();
    }
  });

  test('returns a valid stored method', () => {
    const restore = installMemorySessionStorage();
    try {
      sessionStorage.setItem(MERGE_METHOD_STORAGE_KEY, 'SQUASH');
      expect(readStoredMergeMethod()).toBe('SQUASH');

      sessionStorage.setItem(MERGE_METHOD_STORAGE_KEY, 'REBASE');
      expect(readStoredMergeMethod()).toBe('REBASE');

      sessionStorage.setItem(MERGE_METHOD_STORAGE_KEY, 'MERGE');
      expect(readStoredMergeMethod()).toBe('MERGE');
    } finally {
      restore();
    }
  });

  test('falls back to default for invalid stored values', () => {
    const restore = installMemorySessionStorage();
    try {
      sessionStorage.setItem(MERGE_METHOD_STORAGE_KEY, 'nope');
      expect(readStoredMergeMethod()).toBe(DEFAULT_MERGE_METHOD);

      sessionStorage.setItem(MERGE_METHOD_STORAGE_KEY, 'squash');
      expect(readStoredMergeMethod()).toBe(DEFAULT_MERGE_METHOD);
    } finally {
      restore();
    }
  });

  test('falls back to default when sessionStorage.getItem throws', () => {
    const restore = installMemorySessionStorage({
      getItem: () => {
        throw new Error('SecurityError');
      },
    });
    try {
      expect(readStoredMergeMethod()).toBe(DEFAULT_MERGE_METHOD);
    } finally {
      restore();
    }
  });
});

test.describe('storeMergeMethod', () => {
  test('writes the method under MERGE_METHOD_STORAGE_KEY', () => {
    const restore = installMemorySessionStorage();
    try {
      storeMergeMethod('SQUASH');
      expect(sessionStorage.getItem(MERGE_METHOD_STORAGE_KEY)).toBe('SQUASH');

      storeMergeMethod('REBASE');
      expect(sessionStorage.getItem(MERGE_METHOD_STORAGE_KEY)).toBe('REBASE');
    } finally {
      restore();
    }
  });

  test('swallows quota / private-mode setItem errors', () => {
    const restore = installMemorySessionStorage({
      setItem: () => {
        throw new Error('QuotaExceededError');
      },
    });
    try {
      expect(() => storeMergeMethod('SQUASH')).not.toThrow();
    } finally {
      restore();
    }
  });
});
