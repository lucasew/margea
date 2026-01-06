export interface PullRequest {
  id: string;
  number: number;
  title: string;
  body: string | null;
  state: 'OPEN' | 'CLOSED' | 'MERGED';
  ciStatus: 'SUCCESS' | 'FAILURE' | 'PENDING' | null;
  createdAt: string;
  updatedAt: string;
  mergedAt: string | null;
  closedAt: string | null;
  url: string;
  baseRefName: string;
  headRefName: string;
  author: {
    login: string;
    avatarUrl: string;
  } | null;
  labels: {
    nodes: Array<{
      id: string;
      name: string;
      color: string;
      description: string | null;
    }> | null;
  } | null;
  repository: {
    id: string;
    name: string;
    nameWithOwner: string;
    owner: {
      login: string;
    };
  };
}

export interface PRGroup {
  key: string;
  package: string;
  baseRef: string;
  labels: string[];
  prs: PullRequest[];
  count: number;
}

export type PRState = 'OPEN' | 'CLOSED' | 'MERGED' | 'ALL';

export interface FilterOptions {
  repository?: string;
  state?: PRState;
}

export type BulkActionType = 'merge' | 'close';

export interface BulkActionProgress {
  prId: string;
  prNumber: number;
  prTitle: string;
  status: 'pending' | 'processing' | 'success' | 'error';
  error?: string;
}

export interface BulkActionState {
  isOpen: boolean;
  actionType: BulkActionType | null;
  selectedPRs: PullRequest[];
  progress: BulkActionProgress[];
  isExecuting: boolean;
}
