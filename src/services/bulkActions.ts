import { commitMutation } from 'react-relay';
import { relayEnvironment } from '../relay/environment';
import { MergePullRequestMutation } from '../queries/MergePullRequestMutation';
import { ClosePullRequestMutation } from '../queries/ClosePullRequestMutation';
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
    onProgress: (progress: BulkActionProgress[]) => void
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
      let retryCount = 0;
      const maxRetries = 5;
      let success = false;

      while (!success && retryCount <= maxRetries) {
        // Atualizar status para processing
        progressMap.set(pr.id, {
          ...progressMap.get(pr.id)!,
          status: 'processing',
        });
        onProgress(Array.from(progressMap.values()));

        // Executar ação
        const result = await performAction(pr.id);

        // Verificar se é erro de rate limit
        const isRateLimitError =
          result.error &&
          (result.error.toLowerCase().includes('rate limit') ||
            result.error.toLowerCase().includes('ratelimit') ||
            result.error.toLowerCase().includes('too many requests') ||
            result.error.includes('429'));

        if (result.success) {
          success = true;
          progressMap.set(pr.id, {
            ...progressMap.get(pr.id)!,
            status: 'success',
          });
        } else if (isRateLimitError && retryCount < maxRetries) {
          // Exponential backoff: 2s, 4s, 8s, 16s, 32s
          const delayMs = Math.pow(2, retryCount + 1) * 1000;
          retryCount++;

          progressMap.set(pr.id, {
            ...progressMap.get(pr.id)!,
            status: 'processing',
            error: `Rate limit - tentativa ${retryCount}/${maxRetries} (aguardando ${
              delayMs / 1000
            }s)`,
          });
          onProgress(Array.from(progressMap.values()));

          await new Promise((resolve) => setTimeout(resolve, delayMs));
        } else {
          // Erro não relacionado a rate limit ou excedeu tentativas
          success = true; // Para sair do loop
          progressMap.set(pr.id, {
            ...progressMap.get(pr.id)!,
            status: 'error',
            error: result.error,
          });
        }

        onProgress(Array.from(progressMap.values()));
      }
    }
  },
};
