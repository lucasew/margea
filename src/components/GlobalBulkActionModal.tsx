import { useBulkAction } from '../context/BulkActionContextValue';
import { BulkActionModal } from './BulkActionModal';

export function GlobalBulkActionModal() {
  const {
    isGlobalModalOpen,
    operations,
    activeModalOperationId,
    closeGlobalModal,
  } = useBulkAction();

  const activeOperation = operations.find(
    (op) => op.id === activeModalOperationId,
  );

  // If no active operation but modal is open, we should probably close it or show nothing.
  // However, `BulkActionModal` expects valid props.
  if (!activeOperation) {
    // If there are operations, maybe default to the last one?
    // But the context logic should have handled this.
    return null;
  }

  return (
    <BulkActionModal
      isOpen={isGlobalModalOpen}
      actionType={activeOperation.type}
      progress={activeOperation.progress}
      isExecuting={activeOperation.isExecuting}
      onConfirm={() => {}}
      onCancel={closeGlobalModal}
    />
  );
}
