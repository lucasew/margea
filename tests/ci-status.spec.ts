import { test, expect } from '@playwright/test';
import {
  countCiStatuses,
  formatCiStatusTooltip,
  type CiStatusCounts,
} from '../src/services/ciStatus';
import { makePR } from './utils/makePR';

const labels = {
  status: 'CI',
  success: 'passed',
  failure: 'failed',
  pending: 'pending',
};

test.describe('countCiStatuses', () => {
  test('empty list returns zero counts', () => {
    expect(countCiStatuses([])).toEqual({
      success: 0,
      failure: 0,
      pending: 0,
      total: 0,
    });
  });

  test('counts mixed SUCCESS, FAILURE, and PENDING', () => {
    const prs = [
      makePR('s1', { ciStatus: 'SUCCESS' }),
      makePR('s2', { ciStatus: 'SUCCESS' }),
      makePR('f1', { ciStatus: 'FAILURE' }),
      makePR('p1', { ciStatus: 'PENDING' }),
      makePR('p2', { ciStatus: 'PENDING' }),
      makePR('p3', { ciStatus: 'PENDING' }),
    ];

    expect(countCiStatuses(prs)).toEqual({
      success: 2,
      failure: 1,
      pending: 3,
      total: 6,
    });
  });

  test('null ciStatus is ignored (not counted in total)', () => {
    const prs = [
      makePR('s1', { ciStatus: 'SUCCESS' }),
      makePR('n1'),
      makePR('f1', { ciStatus: 'FAILURE' }),
      makePR('n2'),
      makePR('p1', { ciStatus: 'PENDING' }),
    ];

    expect(countCiStatuses(prs)).toEqual({
      success: 1,
      failure: 1,
      pending: 1,
      total: 3,
    });
  });

  test('all null yields zeros', () => {
    expect(countCiStatuses([makePR('a'), makePR('b')])).toEqual({
      success: 0,
      failure: 0,
      pending: 0,
      total: 0,
    });
  });

  test('single status buckets', () => {
    expect(countCiStatuses([makePR('s', { ciStatus: 'SUCCESS' })])).toEqual({
      success: 1,
      failure: 0,
      pending: 0,
      total: 1,
    });
    expect(countCiStatuses([makePR('f', { ciStatus: 'FAILURE' })])).toEqual({
      success: 0,
      failure: 1,
      pending: 0,
      total: 1,
    });
    expect(countCiStatuses([makePR('p', { ciStatus: 'PENDING' })])).toEqual({
      success: 0,
      failure: 0,
      pending: 1,
      total: 1,
    });
  });
});

test.describe('formatCiStatusTooltip', () => {
  test('empty counts yields status label and empty body', () => {
    const counts: CiStatusCounts = {
      success: 0,
      failure: 0,
      pending: 0,
      total: 0,
    };
    expect(formatCiStatusTooltip(counts, labels)).toBe('CI: ');
  });

  test('includes only non-zero buckets in order success, failure, pending', () => {
    expect(
      formatCiStatusTooltip(
        { success: 2, failure: 1, pending: 3, total: 6 },
        labels,
      ),
    ).toBe('CI: 2 passed, 1 failed, 3 pending');
  });

  test('omits zero success', () => {
    expect(
      formatCiStatusTooltip(
        { success: 0, failure: 2, pending: 1, total: 3 },
        labels,
      ),
    ).toBe('CI: 2 failed, 1 pending');
  });

  test('omits zero failure', () => {
    expect(
      formatCiStatusTooltip(
        { success: 4, failure: 0, pending: 1, total: 5 },
        labels,
      ),
    ).toBe('CI: 4 passed, 1 pending');
  });

  test('omits zero pending', () => {
    expect(
      formatCiStatusTooltip(
        { success: 1, failure: 2, pending: 0, total: 3 },
        labels,
      ),
    ).toBe('CI: 1 passed, 2 failed');
  });

  test('single non-zero bucket', () => {
    expect(
      formatCiStatusTooltip(
        { success: 5, failure: 0, pending: 0, total: 5 },
        labels,
      ),
    ).toBe('CI: 5 passed');
    expect(
      formatCiStatusTooltip(
        { success: 0, failure: 3, pending: 0, total: 3 },
        labels,
      ),
    ).toBe('CI: 3 failed');
    expect(
      formatCiStatusTooltip(
        { success: 0, failure: 0, pending: 7, total: 7 },
        labels,
      ),
    ).toBe('CI: 7 pending');
  });

  test('uses provided label strings as-is', () => {
    expect(
      formatCiStatusTooltip(
        { success: 1, failure: 1, pending: 0, total: 2 },
        {
          status: 'Checks',
          success: 'ok',
          failure: 'broken',
          pending: 'running',
        },
      ),
    ).toBe('Checks: 1 ok, 1 broken');
  });
});
