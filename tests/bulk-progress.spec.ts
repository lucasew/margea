import { test, expect } from '@playwright/test';
import { summarizeBulkProgress } from '../src/services/bulkProgress';
import type { BulkActionProgress } from '../src/types';

/** Minimal fixture: summarizeBulkProgress only reads status. */
function item(
  status: BulkActionProgress['status'],
  overrides: Partial<BulkActionProgress> = {},
): BulkActionProgress {
  return {
    prId: overrides.prId ?? `PR_${status}`,
    prNumber: overrides.prNumber ?? 1,
    prTitle: overrides.prTitle ?? status,
    status,
    ...overrides,
  };
}

test.describe('summarizeBulkProgress', () => {
  test('empty list: zeros, not started, not complete', () => {
    expect(summarizeBulkProgress([])).toEqual({
      total: 0,
      successCount: 0,
      errorCount: 0,
      doneCount: 0,
      hasStarted: false,
      isComplete: false,
    });
  });

  test('all pending: not started, not complete', () => {
    const progress = [
      item('pending', { prId: 'a', prNumber: 1 }),
      item('pending', { prId: 'b', prNumber: 2 }),
      item('pending', { prId: 'c', prNumber: 3 }),
    ];

    expect(summarizeBulkProgress(progress)).toEqual({
      total: 3,
      successCount: 0,
      errorCount: 0,
      doneCount: 0,
      hasStarted: false,
      isComplete: false,
    });
  });

  test('mixed success and error counts and completion flags', () => {
    const progress = [
      item('success', { prId: 's1' }),
      item('success', { prId: 's2' }),
      item('error', { prId: 'e1', error: 'boom' }),
      item('pending', { prId: 'p1' }),
    ];

    expect(summarizeBulkProgress(progress)).toEqual({
      total: 4,
      successCount: 2,
      errorCount: 1,
      doneCount: 3,
      hasStarted: true,
      isComplete: false,
    });
  });

  test('isComplete is true only when every item is success or error', () => {
    const allDone = [
      item('success', { prId: 's1' }),
      item('error', { prId: 'e1' }),
      item('success', { prId: 's2' }),
    ];
    expect(summarizeBulkProgress(allDone)).toMatchObject({
      total: 3,
      successCount: 2,
      errorCount: 1,
      doneCount: 3,
      isComplete: true,
      hasStarted: true,
    });

    // processing is started but not "done"
    const stillProcessing = [
      item('success', { prId: 's1' }),
      item('processing', { prId: 'p1' }),
    ];
    expect(summarizeBulkProgress(stillProcessing)).toMatchObject({
      total: 2,
      successCount: 1,
      errorCount: 0,
      doneCount: 1,
      isComplete: false,
      hasStarted: true,
    });
  });

  test('hasStarted is true for processing, success, or error', () => {
    expect(summarizeBulkProgress([item('processing')]).hasStarted).toBe(true);
    expect(summarizeBulkProgress([item('success')]).hasStarted).toBe(true);
    expect(summarizeBulkProgress([item('error')]).hasStarted).toBe(true);
    expect(summarizeBulkProgress([item('pending')]).hasStarted).toBe(false);
  });
});
