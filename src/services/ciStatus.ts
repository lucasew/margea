import type { PullRequest } from '../types';

export interface CiStatusCounts {
  success: number;
  failure: number;
  pending: number;
  total: number;
}

export function countCiStatuses(prs: PullRequest[]): CiStatusCounts {
  let success = 0;
  let failure = 0;
  let pending = 0;

  for (const pr of prs) {
    if (pr.ciStatus === 'SUCCESS') success++;
    else if (pr.ciStatus === 'FAILURE') failure++;
    else if (pr.ciStatus === 'PENDING') pending++;
  }

  return { success, failure, pending, total: success + failure + pending };
}

export function formatCiStatusTooltip(
  counts: CiStatusCounts,
  labels: { status: string; success: string; failure: string; pending: string },
): string {
  const parts: string[] = [];
  if (counts.success > 0) parts.push(`${counts.success} ${labels.success}`);
  if (counts.failure > 0) parts.push(`${counts.failure} ${labels.failure}`);
  if (counts.pending > 0) parts.push(`${counts.pending} ${labels.pending}`);
  return `${labels.status}: ${parts.join(', ')}`;
}
