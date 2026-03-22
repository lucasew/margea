import { commitMutation } from 'react-relay';
import { relayEnvironment } from '../relay/environment';
import { MergePullRequestMutation } from '../queries/MergePullRequestMutation';
import { ClosePullRequestMutation } from '../queries/ClosePullRequestMutation';
import { executeWithRetry } from '../utils/retry';
import type { PullRequest, BulkActionProgress } from '../types';
import type { MergePullRequestMutation$data } from '../queries/__generated__/MergePullRequestMutation.graphql';
import type { ClosePullRequestMutation$data } from '../queries/__generated__/ClosePullRequestMutation.graphql';
import type { RecordSourceSelectorProxy } from 'relay-runtime';
import { reportError } from '../utils/errorReporting';

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
        const parsedError = err instanceof Error ? err : new Error(String(err));
        reportError(parsedError, {
          action: 'bulkActionExecution',
          prId: pr.id,
          actionType,
        });
        result = {
          success: false,
          prId: pr.id,
          error: parsedError.message,
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
