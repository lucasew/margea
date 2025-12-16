import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { PullRequest, BulkActionType, BulkActionProgress } from '../types';
import { BulkActionsService } from '../services/bulkActions';

interface BulkActionContextType {
  progress: BulkActionProgress[];
  actionType: BulkActionType | null;
  isExecuting: boolean;
  isGlobalModalOpen: boolean;
  startBulkAction: (prs: PullRequest[], type: BulkActionType) => Promise<void>;
  openGlobalModal: () => void;
  closeGlobalModal: () => void;
  minimizeGlobalModal: () => void;
  clearState: () => void;
}

const BulkActionContext = createContext<BulkActionContextType | undefined>(undefined);

export function BulkActionProvider({ children }: { children: ReactNode }) {
  const [progress, setProgress] = useState<BulkActionProgress[]>([]);
  const [actionType, setActionType] = useState<BulkActionType | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [isGlobalModalOpen, setIsGlobalModalOpen] = useState(false);

  const startBulkAction = useCallback(async (prs: PullRequest[], type: BulkActionType) => {
    setActionType(type);
    setIsExecuting(true);
    // Initialize progress
    const initialProgress = prs.map(pr => ({
      prId: pr.id,
      prNumber: pr.number,
      prTitle: pr.title,
      status: 'pending' as const,
    }));
    setProgress(initialProgress);

    // We keep modal closed by default to support the toast workflow
    setIsGlobalModalOpen(false);

    await BulkActionsService.executeBulkAction(prs, type, (newProgress) => {
      setProgress(newProgress);
    });

    setIsExecuting(false);
  }, []);

  const openGlobalModal = () => setIsGlobalModalOpen(true);
  const closeGlobalModal = () => setIsGlobalModalOpen(false);
  const minimizeGlobalModal = () => setIsGlobalModalOpen(false);

  const clearState = useCallback(() => {
      setProgress([]);
      setActionType(null);
      setIsExecuting(false);
      setIsGlobalModalOpen(false);
  }, []);

  return (
    <BulkActionContext.Provider value={{
      progress,
      actionType,
      isExecuting,
      isGlobalModalOpen,
      startBulkAction,
      openGlobalModal,
      closeGlobalModal,
      minimizeGlobalModal,
      clearState
    }}>
      {children}
    </BulkActionContext.Provider>
  );
}

export function useBulkAction() {
  const context = useContext(BulkActionContext);
  if (context === undefined) {
    throw new Error('useBulkAction must be used within a BulkActionProvider');
  }
  return context;
}
