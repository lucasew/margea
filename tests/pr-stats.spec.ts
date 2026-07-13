import { test, expect } from '@playwright/test';
import { calculateStats } from '../src/services/prStats';
import { makePR } from './utils/makePR';

test.describe('calculateStats', () => {
  test('empty list returns zero counts', () => {
    expect(calculateStats([])).toEqual({
      total: 0,
      open: 0,
      merged: 0,
      closed: 0,
      repositories: 0,
    });
  });

  test('counts by state and unique repositories', () => {
    const prs = [
      makePR('o1', { state: 'OPEN', repository: { nameWithOwner: 'acme/one' } }),
      makePR('o2', { state: 'OPEN', repository: { nameWithOwner: 'acme/one' } }),
      makePR('m1', { state: 'MERGED', repository: { nameWithOwner: 'acme/two' } }),
      makePR('c1', { state: 'CLOSED', repository: { nameWithOwner: 'other/lib' } }),
    ];

    expect(calculateStats(prs)).toEqual({
      total: 4,
      open: 2,
      merged: 1,
      closed: 1,
      repositories: 3,
    });
  });

  test('single open PR counts total, open, and one repository', () => {
    expect(
      calculateStats([
        makePR('only', { state: 'OPEN', repository: { nameWithOwner: 'acme/app' } }),
      ]),
    ).toEqual({
      total: 1,
      open: 1,
      merged: 0,
      closed: 0,
      repositories: 1,
    });
  });

  test('all same repository still reports repositories: 1', () => {
    const prs = [
      makePR('a', { state: 'OPEN', repository: { nameWithOwner: 'acme/app' } }),
      makePR('b', { state: 'MERGED', repository: { nameWithOwner: 'acme/app' } }),
      makePR('c', { state: 'CLOSED', repository: { nameWithOwner: 'acme/app' } }),
    ];

    expect(calculateStats(prs)).toEqual({
      total: 3,
      open: 1,
      merged: 1,
      closed: 1,
      repositories: 1,
    });
  });

  test('only merged and only closed', () => {
    expect(
      calculateStats([
        makePR('m1', { state: 'MERGED', repository: { nameWithOwner: 'a/r' } }),
        makePR('m2', { state: 'MERGED', repository: { nameWithOwner: 'b/r' } }),
      ]),
    ).toEqual({
      total: 2,
      open: 0,
      merged: 2,
      closed: 0,
      repositories: 2,
    });

    expect(
      calculateStats([makePR('c1', { state: 'CLOSED', repository: { nameWithOwner: 'x/y' } })]),
    ).toEqual({
      total: 1,
      open: 0,
      merged: 0,
      closed: 1,
      repositories: 1,
    });
  });
});
