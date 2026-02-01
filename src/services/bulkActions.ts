import { commitMutation } from 'react-relay';
import { relayEnvironment } from '../relay/environment';
import { MergePullRequestMutation } from '../queries/MergePullRequestMutation';
import { ClosePullRequestMutation } from '../queries/ClosePullRequestMutation';
import { withRetry } from '../utils/retry';
import type { PullRequest, BulkActionProgress } from '../types';
import type { GraphQLTaggedNode } from 'relay-runtime';

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
  prId: string,
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
      try {
        await withRetry(
          async () => {
            // Atualizar status para processing (importante para retries)
            progressMap.set(pr.id, {
              ...progressMap.get(pr.id)!,
              status: 'processing',
              error: undefined,
            });
            onProgress(Array.from(progressMap.values()));

            // Executar ação
            const result = await performAction(pr.id);

            if (!result.success) {
              throw new Error(result.error || 'Unknown error');
            }

            return result;
          },
          {
            maxRetries: 5,
            baseDelay: 1000,
            shouldRetry: (error: unknown) => {
              const msg = (
                error instanceof Error ? error.message : String(error)
              ).toLowerCase();
              return (
                msg.includes('rate limit') ||
                msg.includes('ratelimit') ||
                msg.includes('too many requests') ||
                msg.includes('429')
              );
            },
            onRetry: (attempt, _error, delay) => {
              progressMap.set(pr.id, {
                ...progressMap.get(pr.id)!,
                status: 'processing',
                error: `Rate limit - tentativa ${attempt}/5 (aguardando ${
                  delay / 1000
                }s)`,
              });
              onProgress(Array.from(progressMap.values()));
            },
          },
        );

        progressMap.set(pr.id, {
          ...progressMap.get(pr.id)!,
          status: 'success',
        });
      } catch (error: unknown) {
        progressMap.set(pr.id, {
          ...progressMap.get(pr.id)!,
          status: 'error',
          error: error instanceof Error ? error.message : String(error),
        });
      }

      onProgress(Array.from(progressMap.values()));
    }
  },
};
