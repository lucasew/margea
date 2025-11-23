import { commitMutation } from 'react-relay';
import { relayEnvironment } from '../relay/environment';
import { MergePullRequestMutation } from '../queries/MergePullRequestMutation';
import { ClosePullRequestMutation } from '../queries/ClosePullRequestMutation';
import type { PullRequest, BulkActionProgress } from '../types';

export interface BulkActionResult {
  success: boolean;
  prId: string;
  error?: string;
}

export const BulkActionsService = {
  async mergePullRequest(prId: string): Promise<BulkActionResult> {
    return new Promise((resolve) => {
      commitMutation(relayEnvironment, {
        mutation: MergePullRequestMutation,
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
  },

  async closePullRequest(prId: string): Promise<BulkActionResult> {
    return new Promise((resolve) => {
      commitMutation(relayEnvironment, {
        mutation: ClosePullRequestMutation,
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
  },

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
        const result =
          actionType === 'merge'
            ? await this.mergePullRequest(pr.id)
            : await this.closePullRequest(pr.id);

        // Verificar se é erro de rate limit
        const isRateLimitError = result.error && (
          result.error.toLowerCase().includes('rate limit') ||
          result.error.toLowerCase().includes('ratelimit') ||
          result.error.toLowerCase().includes('too many requests') ||
          result.error.includes('429')
        );

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
            error: `Rate limit - tentativa ${retryCount}/${maxRetries} (aguardando ${delayMs / 1000}s)`,
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
