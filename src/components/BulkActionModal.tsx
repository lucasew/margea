import { X, CheckCircle, AlertCircle, Loader } from 'react-feather';
import { useTranslation } from 'react-i18next';
import type { BulkActionType, BulkActionProgress } from '../types';

interface BulkActionModalProps {
  isOpen: boolean;
  actionType: BulkActionType | null;
  progress: BulkActionProgress[];
  isExecuting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function BulkActionModal({
  isOpen,
  actionType,
  progress,
  isExecuting,
  onConfirm,
  onCancel,
}: BulkActionModalProps) {
  const { t } = useTranslation();
  if (!isOpen || !actionType) return null;

  const actionLabel = actionType === 'merge' ? 'Mergear' : 'Fechar';
  const actionColor = actionType === 'merge' ? 'success' : 'error';

  const hasStarted = progress.some(p => p.status !== 'pending');
  const isComplete = progress.length > 0 && progress.every(p => p.status === 'success' || p.status === 'error');
  const successCount = progress.filter(p => p.status === 'success').length;
  const errorCount = progress.filter(p => p.status === 'error').length;

  return (
    <div className="modal modal-open">
      <div className="modal-box max-w-3xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold">
            {hasStarted ? `${actionLabel} PRs - Progresso` : `Confirmar ${actionLabel} PRs`}
          </h3>
          <button
            onClick={onCancel}
            className="btn btn-sm btn-circle btn-ghost"
            aria-label="Fechar"
          >
            <X size={20} />
          </button>
        </div>

        {!hasStarted && (
          <div className="alert alert-warning mb-4">
            <AlertCircle size={20} />
            <span>
              Você está prestes a {actionLabel.toLowerCase()} {progress.length} PR
              {progress.length > 1 ? 's' : ''}. Esta ação não pode ser desfeita.
            </span>
          </div>
        )}

        {isComplete && (
          <div className={`alert ${errorCount > 0 ? 'alert-warning' : 'alert-success'} mb-4`}>
            <CheckCircle size={20} />
            <span>
              {successCount} de {progress.length} PRs {actionType === 'merge' ? 'mergeados' : 'fechados'} com sucesso
              {errorCount > 0 && ` (${errorCount} com erro)`}
            </span>
          </div>
        )}

        <div className="max-h-96 overflow-y-auto">
          <div className="space-y-2">
            {progress.map((item) => (
              <div
                key={item.prId}
                className={`card bg-base-200 p-3 ${
                  item.status === 'processing' ? 'border-2 border-primary' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm">#{item.prNumber}</span>
                      <span className="truncate text-sm">{item.prTitle}</span>
                    </div>
                    {item.error && (
                      <div className="text-xs text-error mt-1">{item.error}</div>
                    )}
                  </div>
                  <div className="ml-4 flex-shrink-0">
                    {item.status === 'pending' && (
                      <div className="badge badge-ghost">{t('bulkActionModal.pending')}</div>
                    )}
                    {item.status === 'processing' && (
                      <div className="flex items-center gap-2">
                        <Loader size={16} className="animate-spin" />
                        <span className="text-sm">{t('bulkActionModal.processing')}</span>
                      </div>
                    )}
                    {item.status === 'success' && (
                      <CheckCircle size={20} className="text-success" />
                    )}
                    {item.status === 'error' && (
                      <AlertCircle size={20} className="text-error" />
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="modal-action">
          {!hasStarted && (
            <>
              <button
                onClick={onCancel}
                className="btn btn-ghost"
                disabled={isExecuting}
              >
                Cancelar
              </button>
              <button
                onClick={onConfirm}
                className={`btn btn-${actionColor}`}
                disabled={isExecuting}
              >
                {actionLabel} {progress.length} PR{progress.length > 1 ? 's' : ''}
              </button>
            </>
          )}
          {hasStarted && !isComplete && (
            <button onClick={onCancel} className="btn btn-ghost">
              Minimizar
            </button>
          )}
          {isComplete && (
            <button onClick={onCancel} className="btn btn-primary">
              Fechar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
