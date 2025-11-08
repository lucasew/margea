export interface PullRequest {
  id: string;
  number: number;
  title: string;
  body: string | null;
  state: 'OPEN' | 'CLOSED' | 'MERGED';
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
