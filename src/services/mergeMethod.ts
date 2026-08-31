import {
  DEFAULT_MERGE_METHOD,
  MERGE_METHODS,
  MERGE_METHOD_STORAGE_KEY,
} from '../constants';
import type { MergeMethod } from '../types';
import { parseAllowed } from '../utils/parseAllowed';

export function isMergeMethod(value: string): value is MergeMethod {
  return (MERGE_METHODS as readonly string[]).includes(value);
}

export function parseMergeMethod(
  value: string | null | undefined,
): MergeMethod {
  return parseAllowed(value, isMergeMethod, DEFAULT_MERGE_METHOD);
}

export function readStoredMergeMethod(): MergeMethod {
  if (typeof sessionStorage === 'undefined') return DEFAULT_MERGE_METHOD;
  try {
    return parseMergeMethod(sessionStorage.getItem(MERGE_METHOD_STORAGE_KEY));
  } catch {
    return DEFAULT_MERGE_METHOD;
  }
}

export function storeMergeMethod(method: MergeMethod): void {
  if (typeof sessionStorage === 'undefined') return;
  try {
    sessionStorage.setItem(MERGE_METHOD_STORAGE_KEY, method);
  } catch {
    // Ignore quota / private mode failures.
  }
}
