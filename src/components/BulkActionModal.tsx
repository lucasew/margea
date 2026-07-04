import { X, CheckCircle, AlertCircle, Loader } from 'react-feather';
import { useTranslation } from 'react-i18next';
import type { BulkActionType, BulkActionProgress } from '../types';
import { summarizeBulkProgress } from '../services/bulkProgress';

interface BulkActionModalProps {
  isOpen: boolean;
  actionType: BulkActionType;
  progress: BulkActionProgress[];
  isExecuting: boolean;
  /** Confirm mode shows warning + confirm/cancel. Progress mode omits confirm. */
  mode: 'confirm' | 'progress';
  onConfirm?: () => void;
  onClose: () => void;
}

export function BulkActionModal({
  isOpen,
  actionType,
  progress,
  isExecuting,
  mode,
  onConfirm,
  onClose,
}: BulkActionModalProps) {
  const { t } = useTranslation();
  if (!isOpen) return null;

  const actionLabel = t(`bulkActionModal.${actionType}`);
  const actionColor = actionType === 'merge' ? 'success' : 'error';
  const { total, successCount, errorCount, hasStarted, isComplete } =
    summarizeBulkProgress(progress);
  const s = total > 1 ? 's' : '';
  const showConfirmActions = mode === 'confirm' && !hasStarted;

  return (
    <div className="modal modal-open">
      <div className="modal-box max-w-3xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold">
            {hasStarted
              ? `${actionLabel} ${t('common.prs')} - ${t('bulkActionModal.progress')}`
              : `${t('bulkActionModal.confirmPrefix')} ${actionLabel} ${t('common.prs')}`}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-sm btn-circle btn-ghost"
            aria-label={t('bulkActionModal.ariaClose')}
          >
            <X size={20} />
          </button>
        </div>

        {showConfirmActions && (
          <div className="alert alert-warning mb-4">
            <AlertCircle size={20} />
            <span>
              {t('bulkActionModal.warning', {
                action: actionLabel.toLowerCase(),
                count: total,
                s,
              })}
            </span>
          </div>
        )}

        {isComplete && (
          <div
            className={`alert ${errorCount > 0 ? 'alert-warning' : 'alert-success'} mb-4`}
          >
            <CheckCircle size={20} />
            <span>
              {t('bulkActionModal.successSummary', {
                success: successCount,
                total,
                actionPast: actionLabel,
              })}
              {errorCount > 0 &&
                t('bulkActionModal.errorSuffix', { count: errorCount })}
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
                      <span className="font-mono text-sm">
                        #{item.prNumber}
                      </span>
                      <span className="truncate text-sm">{item.prTitle}</span>
                    </div>
                    {item.error && (
                      <div className="text-xs text-error mt-1">
                        {item.error}
                      </div>
                    )}
                  </div>
                  <div className="ml-4 flex-shrink-0">
                    {item.status === 'pending' && (
                      <div className="badge badge-ghost">
                        {t('bulkActionModal.pending')}
                      </div>
                    )}
                    {item.status === 'processing' && (
                      <div className="flex items-center gap-2">
                        <Loader size={16} className="animate-spin" />
                        <span className="text-sm">
                          {t('bulkActionModal.processing')}
                        </span>
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
          {showConfirmActions && (
            <>
              <button
                type="button"
                onClick={onClose}
                className="btn btn-ghost"
                disabled={isExecuting}
              >
                {t('bulkActionModal.cancel')}
              </button>
              <button
                type="button"
                onClick={onConfirm}
                className={`btn btn-${actionColor}`}
                disabled={isExecuting || !onConfirm}
              >
                {t(`prGroupDetail.${actionType}`, { count: total })}
              </button>
            </>
          )}
          {hasStarted && !isComplete && (
            <button type="button" onClick={onClose} className="btn btn-ghost">
              {t('bulkActionModal.minimize')}
            </button>
          )}
          {isComplete && (
            <button type="button" onClick={onClose} className="btn btn-primary">
              {t('bulkActionModal.closeBtn')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
