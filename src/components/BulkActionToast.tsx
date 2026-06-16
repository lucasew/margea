import { CheckCircle, AlertCircle, X, Maximize2 } from 'react-feather';
import { useTranslation } from 'react-i18next';
import { useBulkAction } from '../hooks/useBulkAction';

export function BulkActionToast() {
  const { t } = useTranslation();
  const { operations, openGlobalModal, dismissOperation } = useBulkAction();

  if (operations.length === 0) return null;

  return (
    <>
      {operations.map((op) => {
        const { progress, isExecuting, id } = op;
        const successCount = progress.filter(
          (p) => p.status === 'success',
        ).length;
        const errorCount = progress.filter((p) => p.status === 'error').length;
        const total = progress.length;
        const isComplete = !isExecuting;

        // If for some reason empty progress, skip rendering this alert
        if (progress.length === 0) return null;

        // Determine color
        let alertClass = 'alert-info';
        if (isComplete) {
          alertClass = errorCount > 0 ? 'alert-warning' : 'alert-success';
        }

        return (
          <div
            key={id}
            className={`alert ${alertClass} shadow-lg flex-row gap-2 min-w-[300px]`}
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
                      done: successCount + errorCount,
                      total,
                    })
                  : t('bulkAction.completed', {
                      success: successCount,
                      error: errorCount,
                    })}
              </div>
              <progress
                className="progress progress-primary w-full bg-base-200"
                value={successCount + errorCount}
                max={total}
              ></progress>
            </div>

            <button
              onClick={() => openGlobalModal(id)}
              className="btn btn-ghost btn-xs btn-circle"
              aria-label={t('bulkAction.detailsAria')}
            >
              <Maximize2 size={16} />
            </button>

            {isComplete && (
              <button
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
