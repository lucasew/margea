import { commitMutation } from 'react-relay';
import { relayEnvironment } from '../relay/environment';
import { MergePullRequestMutation } from '../queries/MergePullRequestMutation';
import { ClosePullRequestMutation } from '../queries/ClosePullRequestMutation';
import { executeWithRetry } from '../utils/retry';
import { isRateLimitErrorMessage } from '../utils/rateLimitError';
import { DEFAULT_MERGE_METHOD } from '../constants';
import type {
  PullRequest,
  BulkActionProgress,
  BulkActionType,
  MergeMethod,
} from '../types';
import type { MergePullRequestMutation$data } from '../queries/__generated__/MergePullRequestMutation.graphql';
import type { ClosePullRequestMutation$data } from '../queries/__generated__/ClosePullRequestMutation.graphql';
import type {
  GraphQLTaggedNode,
  RecordSourceSelectorProxy,
} from 'relay-runtime';

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

type TerminalPrState = 'MERGED' | 'CLOSED';
type TerminalTimestampKey = 'mergedAt' | 'closedAt';

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

function optimisticTerminalFields(
  state: TerminalPrState,
  timestampKey: TerminalTimestampKey,
): Partial<PullRequest> {
  const now = new Date().toISOString();
  return { state, [timestampKey]: now, updatedAt: now };
}

function toTerminalFields(
  state: TerminalPrState,
  timestampKey: TerminalTimestampKey,
  pullRequest:
    | { [K in TerminalTimestampKey]?: string | null }
    | null
    | undefined,
): Partial<PullRequest> {
  const now = new Date().toISOString();
  if (!pullRequest) return { state, updatedAt: now };

  const timestamp = pullRequest[timestampKey] ?? null;
  return {
    state,
    [timestampKey]: timestamp,
    updatedAt: timestamp ?? now,
  };
}

function toMergeFields(
  data?: MergePullRequestMutation$data | null,
): Partial<PullRequest> {
  return toTerminalFields(
    'MERGED',
    'mergedAt',
    data?.mergePullRequest?.pullRequest,
  );
}

function toCloseFields(
  data?: ClosePullRequestMutation$data | null,
): Partial<PullRequest> {
  return toTerminalFields(
    'CLOSED',
    'closedAt',
    data?.closePullRequest?.pullRequest,
  );
}

function commitPullRequestMutation(options: {
  prId: string;
  mutation: GraphQLTaggedNode;
  variables: { input: Record<string, unknown> };
  optimisticFields: Partial<PullRequest>;
  toFields: (data: unknown) => Partial<PullRequest>;
}): Promise<BulkActionResult> {
  const { prId, mutation, variables, optimisticFields, toFields } = options;

  return new Promise((resolve) => {
    commitMutation(relayEnvironment, {
      mutation,
      variables,
      optimisticUpdater: (store) => {
        updatePullRequestRecord(store, prId, optimisticFields);
      },
      updater: (store, data) => {
        updatePullRequestRecord(store, prId, toFields(data));
      },
      onCompleted: (response) => {
        resolve({
          success: true,
          prId,
          updatedFields: toFields(response),
        });
      },
      onError: (error: Error) => {
        resolve({
          success: false,
          prId,
          error: error.message,
        });
      },
      // Relay's commitMutation is generic over mutation payloads; merge/close
      // share one control flow with a narrow toFields adapter per action.
    } as Parameters<typeof commitMutation>[1]);
  });
}

const performMergeMutation = (
  prId: string,
  mergeMethod: MergeMethod = DEFAULT_MERGE_METHOD,
): Promise<BulkActionResult> =>
  commitPullRequestMutation({
    prId,
    mutation: MergePullRequestMutation,
    variables: {
      input: {
        pullRequestId: prId,
        mergeMethod,
      },
    },
    optimisticFields: optimisticTerminalFields('MERGED', 'mergedAt'),
    toFields: (data) =>
      toMergeFields(data as MergePullRequestMutation$data | null | undefined),
  });

const performCloseMutation = (prId: string): Promise<BulkActionResult> =>
  commitPullRequestMutation({
    prId,
    mutation: ClosePullRequestMutation,
    variables: {
      input: {
        pullRequestId: prId,
      },
    },
    optimisticFields: optimisticTerminalFields('CLOSED', 'closedAt'),
    toFields: (data) =>
      toCloseFields(data as ClosePullRequestMutation$data | null | undefined),
  });

export const BulkActionsService = {
  /**
   * Merges a Pull Request.
   *
   * @param prId - The ID of the Pull Request to merge.
   * @returns The result of the merge operation.
   */
  async mergePullRequest(
    prId: string,
    mergeMethod: MergeMethod = DEFAULT_MERGE_METHOD,
  ): Promise<BulkActionResult> {
    return performMergeMutation(prId, mergeMethod);
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
   * @param onResult - Optional callback invoked after each PR finishes.
   * @param options - Extra options such as the GitHub merge method.
   */
  async executeBulkAction(
    prs: PullRequest[],
    actionType: BulkActionType,
    onProgress: (progress: BulkActionProgress[]) => void,
    onResult?: (result: BulkActionResult) => void,
    options?: { mergeMethod?: MergeMethod },
  ): Promise<void> {
    const progressMap = new Map<string, BulkActionProgress>();
    const mergeMethod = options?.mergeMethod ?? DEFAULT_MERGE_METHOD;

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
        ? (id: string) => this.mergePullRequest(id, mergeMethod)
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

            if (
              !res.success &&
              res.error &&
              isRateLimitErrorMessage(res.error)
            ) {
              throw new Error(res.error);
            }

            return res;
          },
          {
            maxRetries: 5,
            initialDelayMs: 2000,
            backoffFactor: 2,
            shouldRetry: (error) =>
              error instanceof Error && isRateLimitErrorMessage(error.message),
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
