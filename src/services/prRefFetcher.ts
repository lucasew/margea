import type { Environment } from 'relay-runtime';
import { fetchQuery } from 'react-relay';
import { PRByNumberQuery } from '../queries/PRByNumberQuery';
import { PRByNumberQuery as PRByNumberQueryType } from '../queries/__generated__/PRByNumberQuery.graphql';
import { transformPR } from './prTransformer';
import type { PRRef, PullRequest } from '../types';

export interface PRRefFetchFailure {
  ref: PRRef;
  error: Error;
}

export interface PRRefFetchResult {
  prs: PullRequest[];
  missing: PRRef[];
  errors: PRRefFetchFailure[];
}

/**
 * Fetches pull requests directly by owner/repo/number. This is the only part
 * the shared PR bundle view borrows from the dashboard data path.
 */
export async function fetchPRsByRefs(
  environment: Environment,
  refs: PRRef[],
): Promise<PRRefFetchResult> {
  const results = await Promise.all(
    refs.map(async (ref) => {
      try {
        const data = await fetchQuery<PRByNumberQueryType>(
          environment,
          PRByNumberQuery,
          {
            owner: ref.owner,
            name: ref.repo,
            number: ref.number,
          },
          { fetchPolicy: 'network-only' },
        ).toPromise();

        return {
          ref,
          pr: transformPR(data?.repository?.pullRequest ?? null),
          error: null,
        };
      } catch (error) {
        return {
          ref,
          pr: null,
          error: error instanceof Error ? error : new Error(String(error)),
        };
      }
    }),
  );

  const prs: PullRequest[] = [];
  const missing: PRRef[] = [];
  const errors: PRRefFetchFailure[] = [];

  for (const result of results) {
    if (result.error) {
      errors.push({ ref: result.ref, error: result.error });
    } else if (result.pr) {
      prs.push(result.pr);
    } else {
      missing.push(result.ref);
    }
  }

  return { prs, missing, errors };
}
