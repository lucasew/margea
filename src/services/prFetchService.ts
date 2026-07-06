import { Environment } from 'relay-runtime';
import { fetchQuery } from 'react-relay';
import { SearchPRsQuery } from '../queries/SearchPRsQuery';
import { SearchPRsQuery as SearchPRsQueryType } from '../queries/__generated__/SearchPRsQuery.graphql';
import { transformPR } from './prTransformer';
import { PullRequest } from '../types';
import { BATCH_SIZE } from '../constants';
import {
  createScopeStream,
  SCOPE_STREAM_IDLE,
  type ScopeStream,
  type ScopeStreamYield,
  type AdaptiveFetchState,
  type PageResult,
  type PageFetcher,
  INITIAL_INTERVAL_MS,
} from './AdaptiveScopeFetcher';

// Re-export the generator-based stream API and state types.
// The store (PRProvider) creates ScopeStreams and pulls PRs from their generators.
export {
  createScopeStream,
  SCOPE_STREAM_IDLE,
  type ScopeStream,
  type ScopeStreamYield,
  type AdaptiveFetchState,
  type PageFetcher,
  INITIAL_INTERVAL_MS,
};

async function fetchPage(
  environment: Environment,
  query: string,
  cursor: string | null,
): Promise<PageResult> {
  const data = await fetchQuery<SearchPRsQueryType>(
    environment,
    SearchPRsQuery,
    { searchQuery: query, first: BATCH_SIZE, after: cursor },
    { fetchPolicy: 'network-only' },
  ).toPromise();

  const prs = (data?.search?.edges || [])
    .map((edge) => transformPR(edge?.node))
    .filter((pr): pr is PullRequest => pr !== null);

  return {
    prs,
    issueCount: data?.search?.issueCount ?? 0,
    hasNextPage: data?.search?.pageInfo?.hasNextPage ?? false,
    endCursor: data?.search?.pageInfo?.endCursor ?? null,
  };
}

export function createPageFetcher(environment: Environment): PageFetcher {
  return (query: string, cursor: string | null) =>
    fetchPage(environment, query, cursor);
}
