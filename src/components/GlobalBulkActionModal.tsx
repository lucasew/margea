import { BulkActionModal } from './BulkActionModal';
import { useBulkAction } from '../hooks/useBulkAction';

export function GlobalBulkActionModal() {
  const {
    isModalOpen,
    operations,
    activeOperationId,
    pendingConfirmation,
    confirmPendingAction,
    cancelPendingAction,
    closeModal,
  } = useBulkAction();

  if (pendingConfirmation) {
    return (
      <BulkActionModal
        isOpen={isModalOpen}
        mode="confirm"
        actionType={pendingConfirmation.type}
        progress={pendingConfirmation.progress}
        isExecuting={false}
        onConfirm={confirmPendingAction}
        onClose={cancelPendingAction}
      />
    );
  }

  const activeOperation = operations.find((op) => op.id === activeOperationId);
  if (!activeOperation) return null;

  return (
    <BulkActionModal
      isOpen={isModalOpen}
      mode="progress"
      actionType={activeOperation.type}
      progress={activeOperation.progress}
      isExecuting={activeOperation.isExecuting}
      mergeMethod={activeOperation.mergeMethod}
      onClose={closeModal}
    />
  );
}
