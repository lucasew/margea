export interface PullRequest {
  id: string;
  number: number;
  title: string;
  body: string | null;
  state: 'OPEN' | 'CLOSED' | 'MERGED';
  additions: number;
  deletions: number;
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

export interface FilterOptions {
  repository?: string;
  state?: 'OPEN' | 'CLOSED' | 'MERGED' | 'ALL';
}

export type BulkActionType = 'merge' | 'close';

export interface BulkActionProgress {
  prId: string;
  prNumber: number;
  prTitle: string;
  status: 'pending' | 'processing' | 'success' | 'error';
  error?: string;
}

export interface BulkActionOperation {
  id: string;
  type: BulkActionType;
  progress: BulkActionProgress[];
  isExecuting: boolean;
  timestamp: number;
}

export interface BulkActionState {
  isOpen: boolean;
  actionType: BulkActionType | null;
  selectedPRs: PullRequest[];
  progress: BulkActionProgress[];
  isExecuting: boolean;
}

export interface MainLayoutContextType {
  onLogout: () => void;
  onLogin: () => void;
  onChangePermissions: () => void;
  isAuthenticated: boolean;
  currentMode: 'read' | 'write' | null;
}

export interface PRContextState {
  prMap: Map<string, PullRequest>;
  pageInfo: {
    endCursor: string | null;
    hasNextPage: boolean;
  };
  isLoading: boolean;
  isFetchingNextPage: boolean;
  searchQuery: string;
  error: Error | null;
}

export interface PRContextType extends PRContextState {
  setSearchQuery: (query: string) => void;
  loadNextPage: () => void;
  refresh: () => void;
  optimisticUpdate: (prId: string, changes: Partial<PullRequest>) => void;
  removePR: (prId: string) => void;
}
