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

export function createBulkOperationId(): string {
  return `op_${Date.now()}_${crypto.randomUUID()}`;
}

export type PendingBulkAction = {
  prs: PullRequest[];
  type: BulkActionType;
  progress: BulkActionProgress[];
};
