import type { BulkActionProgress, BulkActionType, PullRequest } from '../types';

export interface BulkProgressSummary {
  total: number;
  successCount: number;
  errorCount: number;
  doneCount: number;
  hasStarted: boolean;
  isComplete: boolean;
}

export function toPendingProgress(prs: PullRequest[]): BulkActionProgress[] {
  return prs.map((pr) => ({
    prId: pr.id,
    prNumber: pr.number,
    prTitle: pr.title,
    status: 'pending' as const,
  }));
}

export function summarizeBulkProgress(
  progress: BulkActionProgress[],
): BulkProgressSummary {
  let successCount = 0;
  let errorCount = 0;
  let hasStarted = false;

  for (const item of progress) {
    if (item.status !== 'pending') hasStarted = true;
    if (item.status === 'success') successCount++;
    else if (item.status === 'error') errorCount++;
  }

  const total = progress.length;
  const doneCount = successCount + errorCount;

  return {
    total,
    successCount,
    errorCount,
    doneCount,
    hasStarted,
    isComplete: total > 0 && doneCount === total,
  };
}

let fallbackIdCounter = 0;

function createRandomIdSuffix(): string {
  const randomUUID = globalThis.crypto?.randomUUID;
  if (typeof randomUUID === 'function') {
    return randomUUID.call(globalThis.crypto);
  }

  const getRandomValues = globalThis.crypto?.getRandomValues;
  if (typeof getRandomValues === 'function') {
    const bytes = new Uint8Array(16);
    getRandomValues.call(globalThis.crypto, bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0'));
    return [
      hex.slice(0, 4).join(''),
      hex.slice(4, 6).join(''),
      hex.slice(6, 8).join(''),
      hex.slice(8, 10).join(''),
      hex.slice(10, 16).join(''),
    ].join('-');
  }

  fallbackIdCounter += 1;
  return `fallback_${fallbackIdCounter}_${Math.random().toString(36).slice(2, 11)}`;
}

export function createBulkOperationId(): string {
  return `op_${Date.now()}_${createRandomIdSuffix()}`;
}

export type PendingBulkAction = {
  prs: PullRequest[];
  type: BulkActionType;
  progress: BulkActionProgress[];
};
