import { CheckCircle, AlertCircle, X, Maximize2 } from 'react-feather';
import { useTranslation } from 'react-i18next';
import { useBulkAction } from '../hooks/useBulkAction';
import { summarizeBulkProgress } from '../services/bulkProgress';

export function BulkActionToast() {
  const { t } = useTranslation();
  const { operations, openOperationModal, dismissOperation } = useBulkAction();

  if (operations.length === 0) return null;

  return (
    <>
      {operations.map((op) => {
        const { progress, isExecuting, id } = op;
        if (progress.length === 0) return null;

        const { successCount, errorCount, doneCount, total } =
          summarizeBulkProgress(progress);
        const isComplete = !isExecuting;

        let alertClass = 'alert-info';
        if (isComplete) {
          alertClass = errorCount > 0 ? 'alert-warning' : 'alert-success';
        }

        return (
          <div
            key={id}
            className={`alert ${alertClass} shadow-lg flex-row gap-2 w-80 max-w-[calc(100vw-2rem)] shrink-0`}
          >
            {isExecuting ? (
              <span className="loading loading-spinner loading-sm"></span>
            ) : isComplete && errorCount === 0 ? (
              <CheckCircle size={20} />
            ) : (
              <AlertCircle size={20} />
            )}

            <div className="flex-1">
              <div className="font-bold text-sm">
                {isExecuting
                  ? t('bulkAction.processing', {
                      done: doneCount,
                      total,
                    })
                  : t('bulkAction.completed', {
                      success: successCount,
                      error: errorCount,
                    })}
              </div>
              <progress
                className="progress progress-primary w-full bg-base-200"
                value={doneCount}
                max={total}
              ></progress>
            </div>

            <button
              type="button"
              onClick={() => openOperationModal(id)}
              className="btn btn-ghost btn-xs btn-circle"
              aria-label={t('bulkAction.detailsAria')}
            >
              <Maximize2 size={16} />
            </button>

            {isComplete && (
              <button
                type="button"
                onClick={() => dismissOperation(id)}
                className="btn btn-ghost btn-xs btn-circle"
                aria-label={t('bulkAction.closeAria')}
              >
                <X size={16} />
              </button>
            )}
          </div>
        );
      })}
    </>
  );
}
