import { CheckCircle, AlertCircle, X, Maximize2 } from 'react-feather';
import { useBulkAction } from '../context/BulkActionContext';

export function BulkActionToast() {
  const { progress, isExecuting, openGlobalModal, clearState } = useBulkAction();

  if (progress.length === 0) return null;

  const successCount = progress.filter(p => p.status === 'success').length;
  const errorCount = progress.filter(p => p.status === 'error').length;
  const total = progress.length;
  const isComplete = !isExecuting;

  if (isComplete && errorCount === 0 && successCount === 0) {
      // Cleared or initial
      return null;
  }

  // Determine color
  let alertClass = 'alert-info';
  if (isComplete) {
      alertClass = errorCount > 0 ? 'alert-warning' : 'alert-success';
  }

  return (
    <div className="toast toast-end z-50">
      <div className={`alert ${alertClass} shadow-lg flex-row gap-2 min-w-[300px]`}>
        {isExecuting ? (
           <span className="loading loading-spinner loading-sm"></span>
        ) : isComplete && errorCount === 0 ? (
           <CheckCircle size={20} />
        ) : (
           <AlertCircle size={20} />
        )}

        <div className="flex-1">
           <div className="font-bold text-sm">
             {isExecuting ? (
                `Processando (${successCount + errorCount}/${total})`
             ) : (
                `Concluído: ${successCount} sucesso, ${errorCount} erro`
             )}
           </div>
           <progress
             className="progress progress-primary w-full bg-base-200"
             value={successCount + errorCount}
             max={total}
           ></progress>
        </div>

        <button onClick={openGlobalModal} className="btn btn-ghost btn-xs btn-circle" aria-label="Detalhes">
           <Maximize2 size={16} />
        </button>

        {isComplete && (
            <button onClick={clearState} className="btn btn-ghost btn-xs btn-circle" aria-label="Fechar">
               <X size={16} />
            </button>
        )}
      </div>
    </div>
  )
}
