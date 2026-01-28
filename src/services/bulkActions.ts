import { commitMutation } from 'react-relay';
import { relayEnvironment } from '../relay/environment';
import { MergePullRequestMutation } from '../queries/MergePullRequestMutation';
import { ClosePullRequestMutation } from '../queries/ClosePullRequestMutation';
import type { PullRequest, BulkActionProgress } from '../types';
import type { GraphQLTaggedNode } from 'relay-runtime';
import { retryOperation } from '../utils/retry';

/**
 * Represents the result of a single bulk action operation on a Pull Request.
 */
export interface BulkActionResult {
  /** Whether the operation was successful. */
  success: boolean;
  /** The ID of the Pull Request involved. */
  prId: string;
  /** Error message if the operation failed. */
  error?: string;
}

/**
 * Helper function to perform a Relay mutation and normalize the result.
 *
 * It wraps `commitMutation` in a Promise to allow async/await usage and standardized error handling.
 *
 * @param mutation - The GraphQL mutation to execute.
 * @param prId - The ID of the Pull Request to mutate.
 * @returns A promise that resolves to a `BulkActionResult`.
 */
const performMutation = (
  mutation: GraphQLTaggedNode,
  prId: string
): Promise<BulkActionResult> => {
  return new Promise((resolve) => {
    commitMutation(relayEnvironment, {
      mutation,
      variables: {
        input: {
          pullRequestId: prId,
        },
      },
      onCompleted: () => {
        resolve({
          success: true,
          prId,
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
 * Checks if an error message indicates a rate limit issue.
 */
const isRateLimitError = (error?: string): boolean => {
  if (!error) return false;
  const lowerError = error.toLowerCase();
  return (
    lowerError.includes('rate limit') ||
    lowerError.includes('ratelimit') ||
    lowerError.includes('too many requests') ||
    error.includes('429')
  );
};

export const BulkActionsService = {
  /**
   * Merges a Pull Request.
   *
   * @param prId - The ID of the Pull Request to merge.
   * @returns The result of the merge operation.
   */
  async mergePullRequest(prId: string): Promise<BulkActionResult> {
    return performMutation(MergePullRequestMutation, prId);
  },

  /**
   * Closes a Pull Request.
   *
   * @param prId - The ID of the Pull Request to close.
   * @returns The result of the close operation.
   */
  async closePullRequest(prId: string): Promise<BulkActionResult> {
    return performMutation(ClosePullRequestMutation, prId);
  },

  /**
   * Executes a bulk action (merge or close) on a list of Pull Requests.
   *
   * This function implements a robust execution strategy using the `retryOperation` utility:
   * 1. **Sequential Execution**: Processes PRs one by one.
   * 2. **Retry with Backoff**: Automatically retries on rate limit errors using exponential backoff.
   * 3. **Progress Reporting**: Updates progress status during processing and retries.
   *
   * @param prs - List of Pull Requests to process.
   * @param actionType - The action to perform ('merge' or 'close').
   * @param onProgress - Callback function to report progress updates.
   */
  async executeBulkAction(
    prs: PullRequest[],
    actionType: 'merge' | 'close',
    onProgress: (progress: BulkActionProgress[]) => void
  ): Promise<void> {
    const progressMap = new Map<string, BulkActionProgress>();

    // Initialize progress
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

    // Helper to update progress and notify
    const updateProgress = (id: string, updates: Partial<BulkActionProgress>) => {
      const current = progressMap.get(id);
      if (current) {
        progressMap.set(id, { ...current, ...updates });
        onProgress(Array.from(progressMap.values()));
      }
    };

    // Process each PR sequentially
    for (const pr of prs) {
      updateProgress(pr.id, { status: 'processing', error: undefined });

      const result = await retryOperation(
        () => performAction(pr.id),
        {
          maxRetries: 5,
          baseDelay: 1000,
          shouldRetry: (res) => !res.success && isRateLimitError(res.error),
          onRetry: (attempt, delay) => {
            updateProgress(pr.id, {
              status: 'processing',
              error: `Rate limit - tentativa ${attempt}/5 (aguardando ${delay / 1000}s)`,
            });
          },
        }
      );

      if (result.success) {
        updateProgress(pr.id, { status: 'success', error: undefined });
      } else {
        updateProgress(pr.id, { status: 'error', error: result.error });
      }
    }
  },
};
