import { useBulkAction } from '../context/BulkActionContext';
import { BulkActionModal } from './BulkActionModal';

export function GlobalBulkActionModal() {
  const {
    isGlobalModalOpen,
    actionType,
    progress,
    isExecuting,
    closeGlobalModal
  } = useBulkAction();

  return (
    <BulkActionModal
      isOpen={isGlobalModalOpen}
      actionType={actionType}
      progress={progress}
      isExecuting={isExecuting}
      onConfirm={() => {}}
      onCancel={closeGlobalModal}
    />
  );
}
