import { test, expect } from '@playwright/test';
import {
  createBulkOperationId,
  toPendingProgress,
} from '../src/services/bulkProgress';
import {
  parseMergeMethod,
  readStoredMergeMethod,
  storeMergeMethod,
} from '../src/services/mergeMethod';
import { MERGE_METHOD_STORAGE_KEY } from '../src/constants';
import type { PullRequest } from '../src/types';

function makePR(id: string): PullRequest {
  return {
    id,
    number: 1,
    title: id,
    body: null,
    state: 'OPEN',
    additions: 0,
    deletions: 0,
    ciStatus: null,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    mergedAt: null,
    closedAt: null,
    url: `https://example.com/${id}`,
    baseRefName: 'main',
    headRefName: `b-${id}`,
    author: { login: 'bot', avatarUrl: '' },
    labels: null,
    repository: {
      id: 'repo',
      name: 'app',
      nameWithOwner: 'acme/app',
      owner: { login: 'acme' },
    },
  };
}

/**
 * Mirrors BulkActionProvider confirm handoff:
 * pending is read from a ref so a synchronous dialog "close"/cancel
 * that clears React state cannot skip starting the operation.
 */
function confirmFromRef(
  pendingRef: {
    current: { prs: PullRequest[]; type: 'merge' | 'close' } | null;
  },
  runOperation: (prs: PullRequest[], type: 'merge' | 'close') => void,
) {
  const pending = pendingRef.current;
  if (!pending) return false;
  const { prs, type } = pending;
  pendingRef.current = null;
  runOperation(prs, type);
  return true;
}

test.describe('bulk action confirm handoff', () => {
  test('starts operation even if cancel clears state after confirm reads ref', () => {
    const prs = [makePR('PR_1'), makePR('PR_2')];
    const pendingRef = {
      current: {
        prs,
        type: 'merge' as const,
        progress: toPendingProgress(prs),
      },
    };
    const started: Array<{ count: number; type: string; id: string }> = [];

    const runOperation = (nextPrs: PullRequest[], type: 'merge' | 'close') => {
      started.push({
        count: nextPrs.length,
        type,
        id: createBulkOperationId(),
      });
    };

    // Simulate dialog close/cancel clearing React state first.
    let pendingState: typeof pendingRef.current = pendingRef.current;
    const cancelPendingAction = () => {
      pendingState = null;
    };

    const confirmed = confirmFromRef(pendingRef, runOperation);
    cancelPendingAction();

    expect(confirmed).toBe(true);
    expect(pendingRef.current).toBeNull();
    expect(pendingState).toBeNull();
    expect(started).toEqual([
      expect.objectContaining({ count: 2, type: 'merge' }),
    ]);
    expect(started[0]?.id).toMatch(/^op_\d+_/);
  });

  test('no-ops when pending was already cleared', () => {
    const pendingRef = { current: null };
    let called = false;
    const confirmed = confirmFromRef(pendingRef, () => {
      called = true;
    });
    expect(confirmed).toBe(false);
    expect(called).toBe(false);
  });

  test('parseMergeMethod accepts GitHub strategies and defaults invalid values', () => {
    expect(parseMergeMethod('MERGE')).toBe('MERGE');
    expect(parseMergeMethod('SQUASH')).toBe('SQUASH');
    expect(parseMergeMethod('REBASE')).toBe('REBASE');
    expect(parseMergeMethod('nope')).toBe('MERGE');
    expect(parseMergeMethod(null)).toBe('MERGE');
  });

  test('stores and reads the last selected merge method', () => {
    sessionStorage.removeItem(MERGE_METHOD_STORAGE_KEY);
    expect(readStoredMergeMethod()).toBe('MERGE');
    storeMergeMethod('SQUASH');
    expect(readStoredMergeMethod()).toBe('SQUASH');
    storeMergeMethod('REBASE');
    expect(sessionStorage.getItem(MERGE_METHOD_STORAGE_KEY)).toBe('REBASE');
  });

  test('createBulkOperationId works without crypto.randomUUID', () => {
    const originalCrypto = globalThis.crypto;
    const bytes = new Uint8Array(16).fill(7);
    Object.defineProperty(globalThis, 'crypto', {
      configurable: true,
      value: {
        getRandomValues: (target: Uint8Array) => {
          target.set(bytes.subarray(0, target.length));
          return target;
        },
      },
    });

    try {
      const id = createBulkOperationId();
      expect(id).toMatch(
        /^op_\d+_[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
      );
    } finally {
      Object.defineProperty(globalThis, 'crypto', {
        configurable: true,
        value: originalCrypto,
      });
    }
  });
});
