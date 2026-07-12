import { commitMutation } from 'react-relay';
import { relayEnvironment } from '../relay/environment';
import { MergePullRequestMutation } from '../queries/MergePullRequestMutation';
import { ClosePullRequestMutation } from '../queries/ClosePullRequestMutation';
import { executeWithRetry } from '../utils/retry';
import { isRateLimitErrorMessage } from '../utils/rateLimitError';
import { DEFAULT_MERGE_METHOD } from '../constants';
import i18n from '../i18n';
import { AuthService } from './auth';
import { toPendingProgress } from './bulkProgress';
import type {
  PullRequest,
  BulkActionProgress,
  BulkActionType,
  MergeMethod,
} from '../types';
import type { MergePullRequestMutation$data } from '../queries/__generated__/MergePullRequestMutation.graphql';
import type { ClosePullRequestMutation$data } from '../queries/__generated__/ClosePullRequestMutation.graphql';
import type { GraphQLTaggedNode } from 'relay-runtime';

/** Retries after the first rate-limit failure during a bulk action. */
const BULK_RATE_LIMIT_MAX_RETRIES = 5;
const BULK_RATE_LIMIT_INITIAL_DELAY_MS = 2000;

/**
 * Represents the result of a single bulk action operation on a Pull Request.
 */
export interface BulkActionResult {
  /** Whether the operation was successful. */
  success: boolean;
  /** The ID of the Pull Request involved. */
  prId: string;
  /**
   * Fields confirmed by the backend for prMap (list SoT).
   * Relay store is not used for PR list state — adaptive multi-scope
   * search does not fit connection pagination.
   */
  updatedFields?: Partial<PullRequest>;
  /** Error message if the operation failed. */
  error?: string;
}

type TerminalPrState = 'MERGED' | 'CLOSED';
type TerminalTimestampKey = 'mergedAt' | 'closedAt';

function toTerminalFields(
  state: TerminalPrState,
  timestampKey: TerminalTimestampKey,
  pullRequest: { [K in TerminalTimestampKey]?: string | null },
): Partial<PullRequest> {
  const now = new Date().toISOString();
  const timestamp = pullRequest[timestampKey] ?? null;
  return {
    state,
    [timestampKey]: timestamp,
    updatedAt: timestamp ?? now,
  };
}

/** Maps merge mutation payload to list fields; null when pullRequest is missing. */
function toMergeFields(
  data?: MergePullRequestMutation$data | null,
): Partial<PullRequest> | null {
  const pullRequest = data?.mergePullRequest?.pullRequest;
  if (!pullRequest) return null;
  return toTerminalFields('MERGED', 'mergedAt', pullRequest);
}

/** Maps close mutation payload to list fields; null when pullRequest is missing. */
function toCloseFields(
  data?: ClosePullRequestMutation$data | null,
): Partial<PullRequest> | null {
  const pullRequest = data?.closePullRequest?.pullRequest;
  if (!pullRequest) return null;
  return toTerminalFields('CLOSED', 'closedAt', pullRequest);
}

const MISSING_MERGE_PAYLOAD =
  'Merge completed without pullRequest in the response';
const MISSING_CLOSE_PAYLOAD =
  'Close completed without pullRequest in the response';

/**
 * Runs a merge/close mutation. Relay is the network layer only — list UI
 * updates flow through updatedFields → BulkActionProvider → prMap.
 */
function commitPullRequestMutation(options: {
  prId: string;
  mutation: GraphQLTaggedNode;
  variables: { input: Record<string, unknown> };
  toFields: (data: unknown) => Partial<PullRequest> | null;
  missingPayloadError: string;
}): Promise<BulkActionResult> {
  const { prId, mutation, variables, toFields, missingPayloadError } = options;

  return new Promise((resolve) => {
    commitMutation(relayEnvironment, {
      mutation,
      variables,
      onCompleted: (response) => {
        const updatedFields = toFields(response);
        if (!updatedFields) {
          resolve({
            success: false,
            prId,
            error: missingPayloadError,
          });
          return;
        }
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
    toFields: (data) =>
      toMergeFields(data as MergePullRequestMutation$data | null | undefined),
    missingPayloadError: MISSING_MERGE_PAYLOAD,
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
    toFields: (data) =>
      toCloseFields(data as ClosePullRequestMutation$data | null | undefined),
    missingPayloadError: MISSING_CLOSE_PAYLOAD,
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

    // Initialize progress entries as pending
    for (const item of toPendingProgress(prs)) {
      progressMap.set(item.prId, item);
    }

    onProgress(Array.from(progressMap.values()));

    // Defense-in-depth: UI also gates on hasWritePermission, but any caller
    // of this service must not reach GitHub mutations without write mode.
    const canWrite = await AuthService.hasWritePermission();
    if (!canWrite) {
      const error = i18n.t('prGroupDetail.writePermissionRequired');
      for (const pr of prs) {
        const result: BulkActionResult = {
          success: false,
          prId: pr.id,
          error,
        };
        progressMap.set(pr.id, {
          ...progressMap.get(pr.id)!,
          status: 'error',
          error,
        });
        onResult?.(result);
      }
      onProgress(Array.from(progressMap.values()));
      return;
    }

    const performAction =
      actionType === 'merge'
        ? (id: string) => this.mergePullRequest(id, mergeMethod)
        : (id: string) => this.closePullRequest(id);

    // Run actions sequentially with retry and exponential backoff
    for (const pr of prs) {
      // Mark this PR as processing
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
            maxRetries: BULK_RATE_LIMIT_MAX_RETRIES,
            initialDelayMs: BULK_RATE_LIMIT_INITIAL_DELAY_MS,
            backoffFactor: 2,
            shouldRetry: (error) =>
              error instanceof Error && isRateLimitErrorMessage(error.message),
            onRetry: (attempt, delayMs) => {
              progressMap.set(pr.id, {
                ...progressMap.get(pr.id)!,
                status: 'processing',
                error: i18n.t('bulkAction.rateLimitRetry', {
                  attempt,
                  max: BULK_RATE_LIMIT_MAX_RETRIES,
                  seconds: delayMs / 1000,
                }),
              });
              onProgress(Array.from(progressMap.values()));
            },
          },
        );
      } catch (err) {
        // Failed after all retries, or unexpected error
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
