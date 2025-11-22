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

    // Executar ações sequencialmente
    for (const pr of prs) {
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

      // Atualizar com resultado
      progressMap.set(pr.id, {
        ...progressMap.get(pr.id)!,
        status: result.success ? 'success' : 'error',
        error: result.error,
      });
      onProgress(Array.from(progressMap.values()));

      // Pequeno delay entre ações para evitar rate limiting
      if (prs.indexOf(pr) < prs.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }
  },
};
