import { commitMutation } from 'react-relay';
import { relayEnvironment } from '../relay/environment';
import { MergePullRequestMutation } from '../queries/MergePullRequestMutation';
import { ClosePullRequestMutation } from '../queries/ClosePullRequestMutation';
import { executeWithRetry } from '../utils/retry';
import type { PullRequest, BulkActionProgress } from '../types';
import type { MergePullRequestMutation$data } from '../queries/__generated__/MergePullRequestMutation.graphql';
import type { ClosePullRequestMutation$data } from '../queries/__generated__/ClosePullRequestMutation.graphql';
import type { RecordSourceSelectorProxy } from 'relay-runtime';

/**
 * Represents the result of a single bulk action operation on a Pull Request.
 */
export interface BulkActionResult {
  /** Whether the operation was successful. */
  success: boolean;
  /** The ID of the Pull Request involved. */
  prId: string;
  /** Fields confirmed by backend and suitable for local state update. */
  updatedFields?: Partial<PullRequest>;
  /** Error message if the operation failed. */
  error?: string;
}

/**
 * Updates a specific Pull Request record in the Relay local store.
 *
 * This is used for both optimistic UI updates (before the server responds)
 * and for committing the final state after a successful mutation.
 * It directly modifies the Relay cache to prevent requiring a full data refetch.
 *
 * @param store - The Relay record source proxy, giving access to the local cache.
 * @param prId - The global GraphQL ID of the Pull Request to update.
 * @param fields - The subset of fields (state, mergedAt, closedAt, updatedAt) to apply.
 */
function updatePullRequestRecord(
  store: RecordSourceSelectorProxy,
  prId: string,
  fields: Partial<PullRequest>,
) {
  const prRecord = store.get(prId);
  if (!prRecord) return;

  if (fields.state) prRecord.setValue(fields.state, 'state');
  if (typeof fields.mergedAt !== 'undefined') {
    prRecord.setValue(fields.mergedAt, 'mergedAt');
  }
  if (typeof fields.closedAt !== 'undefined') {
    prRecord.setValue(fields.closedAt, 'closedAt');
  }
  if (fields.updatedAt) prRecord.setValue(fields.updatedAt, 'updatedAt');
}

/**
 * Extracts and normalizes the resulting fields from a merge mutation response.
 *
 * Fallbacks to the current timestamp if the server doesn't return `mergedAt`.
 * This ensures the local state always reflects that the PR is 'MERGED'.
 *
 * @param data - The raw response data from the MergePullRequest mutation.
 * @returns An object containing the fields to update in the local cache.
 */
function toMergeFields(
  data?: MergePullRequestMutation$data | null,
): Partial<PullRequest> {
  const mergedPR = data?.mergePullRequest?.pullRequest;
  if (!mergedPR)
    return { state: 'MERGED', updatedAt: new Date().toISOString() };

  const updatedAt = mergedPR.mergedAt ?? new Date().toISOString();
  return {
    state: 'MERGED',
    mergedAt: mergedPR.mergedAt ?? null,
    updatedAt,
  };
}

/**
 * Extracts and normalizes the resulting fields from a close mutation response.
 *
 * Fallbacks to the current timestamp if the server doesn't return `closedAt`.
 * This ensures the local state always reflects that the PR is 'CLOSED'.
 *
 * @param data - The raw response data from the ClosePullRequest mutation.
 * @returns An object containing the fields to update in the local cache.
 */
function toCloseFields(
  data?: ClosePullRequestMutation$data | null,
): Partial<PullRequest> {
  const closedPR = data?.closePullRequest?.pullRequest;
  if (!closedPR)
    return { state: 'CLOSED', updatedAt: new Date().toISOString() };

  const updatedAt = closedPR.closedAt ?? new Date().toISOString();
  return {
    state: 'CLOSED',
    closedAt: closedPR.closedAt ?? null,
    updatedAt,
  };
}

/**
 * Executes a GraphQL mutation to merge a specific Pull Request.
 *
 * Flow:
 * 1. Creates optimistic fields to update the UI immediately.
 * 2. Triggers the Relay `commitMutation`.
 * 3. Applies the optimistic update to the Relay store.
 * 4. Replaces the optimistic data with actual server data upon success.
 * 5. Returns a unified `BulkActionResult` regardless of success or failure.
 *
 * @param prId - The GraphQL ID of the Pull Request to merge.
 * @returns A promise resolving to the result of the merge operation.
 */
const performMergeMutation = (prId: string): Promise<BulkActionResult> => {
  const optimisticNow = new Date().toISOString();
  const optimisticFields: Partial<PullRequest> = {
    state: 'MERGED',
    mergedAt: optimisticNow,
    updatedAt: optimisticNow,
  };

  return new Promise((resolve) => {
    commitMutation(relayEnvironment, {
      mutation: MergePullRequestMutation,
      variables: {
        input: {
          pullRequestId: prId,
        },
      },
      optimisticUpdater: (store) => {
        updatePullRequestRecord(store, prId, optimisticFields);
      },
      updater: (store, data) => {
        const fields = toMergeFields(
          data as MergePullRequestMutation$data | null | undefined,
        );
        updatePullRequestRecord(store, prId, fields);
      },
      onCompleted: (response) => {
        const updatedFields = toMergeFields(
          response as MergePullRequestMutation$data | null | undefined,
        );
        resolve({
          success: true,
          prId,
          updatedFields,
        });
      },
      onError: (error: Error) => {
        resolve({
          success: false,
          prId,
          error: error.message,
        });
      },
    });
  });
};

/**
 * Executes a GraphQL mutation to close a specific Pull Request.
 *
 * Flow:
 * 1. Creates optimistic fields to update the UI immediately.
 * 2. Triggers the Relay `commitMutation`.
 * 3. Applies the optimistic update to the Relay store.
 * 4. Replaces the optimistic data with actual server data upon success.
 * 5. Returns a unified `BulkActionResult` regardless of success or failure.
 *
 * @param prId - The GraphQL ID of the Pull Request to close.
 * @returns A promise resolving to the result of the close operation.
 */
const performCloseMutation = (prId: string): Promise<BulkActionResult> => {
  const optimisticNow = new Date().toISOString();
  const optimisticFields: Partial<PullRequest> = {
    state: 'CLOSED',
    closedAt: optimisticNow,
    updatedAt: optimisticNow,
  };

  return new Promise((resolve) => {
    commitMutation(relayEnvironment, {
      mutation: ClosePullRequestMutation,
      variables: {
        input: {
          pullRequestId: prId,
        },
      },
      optimisticUpdater: (store) => {
        updatePullRequestRecord(store, prId, optimisticFields);
      },
      updater: (store, data) => {
        const fields = toCloseFields(
          data as ClosePullRequestMutation$data | null | undefined,
        );
        updatePullRequestRecord(store, prId, fields);
      },
      onCompleted: (response) => {
        const updatedFields = toCloseFields(
          response as ClosePullRequestMutation$data | null | undefined,
        );
        resolve({
          success: true,
          prId,
          updatedFields,
        });
      },
      onError: (error: Error) => {
        resolve({
          success: false,
          prId,
          error: error.message,
        });
      },
    });
  });
};

export const BulkActionsService = {
  /**
   * Merges a Pull Request.
   *
   * @param prId - The ID of the Pull Request to merge.
   * @returns The result of the merge operation.
   */
  async mergePullRequest(prId: string): Promise<BulkActionResult> {
    return performMergeMutation(prId);
  },

  /**
   * Closes a Pull Request.
   *
   * @param prId - The ID of the Pull Request to close.
   * @returns The result of the close operation.
   */
  async closePullRequest(prId: string): Promise<BulkActionResult> {
    return performCloseMutation(prId);
  },

  /**
   * Executes a bulk action (merge or close) on a list of Pull Requests.
   *
   * This function implements a robust execution strategy:
   * 1. **Sequential Execution**: Processes PRs one by one to avoid overwhelming the server.
   * 2. **Rate Limit Handling**: Detects rate limit errors (429, "too many requests") and automatically retries.
   * 3. **Exponential Backoff**: When a rate limit is hit, waits for an increasing amount of time (2s, 4s, 8s...) between retries.
   * 4. **Progress Reporting**: Calls `onProgress` callback with the status of all PRs after every state change.
   *
   * @param prs - List of Pull Requests to process.
   * @param actionType - The action to perform ('merge' or 'close').
   * @param onProgress - Callback function to report progress updates.
   */
  async executeBulkAction(
    prs: PullRequest[],
    actionType: 'merge' | 'close',
    onProgress: (progress: BulkActionProgress[]) => void,
    onResult?: (result: BulkActionResult) => void,
  ): Promise<void> {
    const progressMap = new Map<string, BulkActionProgress>();

    // Inicializar progresso
    prs.forEach((pr) => {
      progressMap.set(pr.id, {
        prId: pr.id,
        prNumber: pr.number,
        prTitle: pr.title,
        status: 'pending',
      });
    });

    onProgress(Array.from(progressMap.values()));

    const performAction =
      actionType === 'merge'
        ? (id: string) => this.mergePullRequest(id)
        : (id: string) => this.closePullRequest(id);

    // Executar ações sequencialmente com retry e exponential backoff
    for (const pr of prs) {
      // Atualizar status para processing
      progressMap.set(pr.id, {
        ...progressMap.get(pr.id)!,
        status: 'processing',
      });
      onProgress(Array.from(progressMap.values()));

      let result: BulkActionResult;

      try {
        result = await executeWithRetry(
          async () => {
            const res = await performAction(pr.id);

            // Verificar se é erro de rate limit
            const isRateLimitError =
              res.error &&
              (res.error.toLowerCase().includes('rate limit') ||
                res.error.toLowerCase().includes('ratelimit') ||
                res.error.toLowerCase().includes('too many requests') ||
                res.error.includes('429'));

            if (!res.success && isRateLimitError) {
              throw new Error(res.error);
            }

            return res;
          },
          {
            maxRetries: 5,
            initialDelayMs: 2000,
            backoffFactor: 2,
            shouldRetry: (error) => {
              if (error instanceof Error) {
                const msg = error.message.toLowerCase();
                return (
                  msg.includes('rate limit') ||
                  msg.includes('ratelimit') ||
                  msg.includes('too many requests') ||
                  msg.includes('429')
                );
              }
              return false;
            },
            onRetry: (attempt, delayMs) => {
              progressMap.set(pr.id, {
                ...progressMap.get(pr.id)!,
                status: 'processing',
                error: `Rate limit - tentativa ${attempt}/5 (aguardando ${
                  delayMs / 1000
                }s)`,
              });
              onProgress(Array.from(progressMap.values()));
            },
          },
        );
      } catch (err) {
        // Erro após todas as retentativas ou erro inesperado
        result = {
          success: false,
          prId: pr.id,
          error: err instanceof Error ? err.message : String(err),
        };
      }

      if (result.success) {
        progressMap.set(pr.id, {
          ...progressMap.get(pr.id)!,
          status: 'success',
          error: undefined,
        });
      } else {
        progressMap.set(pr.id, {
          ...progressMap.get(pr.id)!,
          status: 'error',
          error: result.error,
        });
      }

      if (onResult) {
        onResult(result);
      }

      onProgress(Array.from(progressMap.values()));
    }
  },
};
