import { GROUPING_STRATEGIES, PR_STATES, type PRState } from '../constants';
import type { GroupingStrategy } from '../types';

const DEFAULT_PR_STATE: PRState = 'ALL';
const DEFAULT_GROUPING_STRATEGY: GroupingStrategy = 'renovate';

function isPRState(value: string): value is PRState {
  return (PR_STATES as readonly string[]).includes(value);
}

/**
 * Parses a URL/search param into a valid PRState.
 * Invalid or missing values fall back to `'ALL'`.
 */
export function parsePRState(value: string | null | undefined): PRState {
  if (value && isPRState(value)) return value;
  return DEFAULT_PR_STATE;
}

function isGroupingStrategy(value: string): value is GroupingStrategy {
  return Object.prototype.hasOwnProperty.call(GROUPING_STRATEGIES, value);
}

/**
 * Parses a URL/search param into a valid GroupingStrategy.
 * Invalid or missing values fall back to `'renovate'`.
 */
export function parseGroupingStrategy(
  value: string | null | undefined,
): GroupingStrategy {
  if (value && isGroupingStrategy(value)) return value;
  return DEFAULT_GROUPING_STRATEGY;
}
