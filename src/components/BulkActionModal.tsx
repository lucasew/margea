import { useEffect, useRef, useState } from 'react';
import { X, CheckCircle, AlertCircle, Loader } from 'react-feather';
import { useTranslation } from 'react-i18next';
import { MERGE_METHODS } from '../constants';
import type {
  BulkActionType,
  BulkActionProgress,
  ConfirmBulkActionOptions,
  MergeMethod,
} from '../types';
import { summarizeBulkProgress } from '../services/bulkProgress';
import {
  parseMergeMethod,
  readStoredMergeMethod,
} from '../services/mergeMethod';

interface BulkActionModalProps {
  isOpen: boolean;
  actionType: BulkActionType;
  progress: BulkActionProgress[];
  isExecuting: boolean;
  /** Confirm mode shows warning + confirm/cancel. Progress mode omits confirm. */
  mode: 'confirm' | 'progress';
  mergeMethod?: MergeMethod;
  onConfirm?: (options?: ConfirmBulkActionOptions) => void;
  onClose: () => void;
}

export function BulkActionModal({
  isOpen,
  actionType,
  progress,
  isExecuting,
  mode,
  mergeMethod: mergeMethodProp,
  onConfirm,
  onClose,
}: BulkActionModalProps) {
  const { t } = useTranslation();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const isOpenRef = useRef(isOpen);
  const onCloseRef = useRef(onClose);
  const onConfirmRef = useRef(onConfirm);
  const suppressCloseCallbackRef = useRef(false);
  const selectionKey = `${isOpen}|${mode}|${actionType}|${mergeMethodProp ?? ''}`;
  const [prevSelectionKey, setPrevSelectionKey] = useState(selectionKey);
  const [mergeMethod, setMergeMethod] = useState<MergeMethod>(
    () => mergeMethodProp ?? readStoredMergeMethod(),
  );
  const mergeMethodRef = useRef(mergeMethod);

  if (selectionKey !== prevSelectionKey) {
    setPrevSelectionKey(selectionKey);
    if (mergeMethodProp) {
      setMergeMethod(mergeMethodProp);
    } else if (isOpen && mode === 'confirm' && actionType === 'merge') {
      setMergeMethod(readStoredMergeMethod());
    }
  }

  useEffect(() => {
    isOpenRef.current = isOpen;
    onCloseRef.current = onClose;
    onConfirmRef.current = onConfirm;
  }, [isOpen, onClose, onConfirm]);

  useEffect(() => {
    mergeMethodRef.current = mergeMethod;
  }, [mergeMethod]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      if (!dialog.open) dialog.showModal();
    } else if (dialog.open) {
      suppressCloseCallbackRef.current = true;
      dialog.close();
    }
  }, [isOpen]);

  useEffect(() => {
    const dialog = dialogRef.current;
    return () => {
      if (dialog?.open) {
        suppressCloseCallbackRef.current = true;
        dialog.close();
      }
    };
  }, []);

  const requestClose = () => {
    const dialog = dialogRef.current;
    if (dialog?.open) dialog.close();
    else onCloseRef.current();
  };

  const handleDialogClose = () => {
    if (suppressCloseCallbackRef.current) {
      suppressCloseCallbackRef.current = false;
      return;
    }
    if (isOpenRef.current) onCloseRef.current();
  };

  const handleConfirmClick = () => {
    if (!onConfirmRef.current) return;
    suppressCloseCallbackRef.current = true;
    onConfirmRef.current(
      actionType === 'merge'
        ? { mergeMethod: mergeMethodRef.current }
        : undefined,
    );
    const dialog = dialogRef.current;
    if (dialog?.open) dialog.close();
  };

  const actionLabel = t(`bulkActionModal.${actionType}`);
  const confirmBtnClass =
    actionType === 'merge' ? 'btn btn-success' : 'btn btn-error';
  const { total, successCount, errorCount, hasStarted, isComplete } =
    summarizeBulkProgress(progress);
  const s = total > 1 ? 's' : '';
  const showConfirmActions = mode === 'confirm' && !hasStarted;
  const showMergeMethodPicker =
    actionType === 'merge' && mode === 'confirm' && !hasStarted;
  const shownMergeMethod =
    actionType === 'merge' ? (mergeMethodProp ?? mergeMethod) : undefined;

  return (
    <dialog
      ref={dialogRef}
      className="modal"
      onClose={handleDialogClose}
      aria-labelledby="bulk-action-modal-title"
    >
      <div className="modal-box max-w-3xl">
        <div className="flex items-center justify-between mb-4">
          <h3 id="bulk-action-modal-title" className="text-lg font-bold">
            {hasStarted
              ? `${actionLabel} ${t('common.prs')} - ${t('bulkActionModal.progress')}`
              : `${t('bulkActionModal.confirmPrefix')} ${actionLabel} ${t('common.prs')}`}
          </h3>
          <button
            type="button"
            onClick={requestClose}
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

        {showMergeMethodPicker && (
          <div className="form-control mb-4">
            <label
              className="label py-0.5 min-h-0"
              htmlFor="bulk-action-merge-method"
            >
              <span className="label-text text-xs font-medium text-base-content/70">
                {t('bulkActionModal.mergeMethod')}
              </span>
            </label>
            <select
              id="bulk-action-merge-method"
              className="select select-bordered select-sm w-full"
              value={mergeMethod}
              onChange={(e) => setMergeMethod(parseMergeMethod(e.target.value))}
            >
              {MERGE_METHODS.map((method) => (
                <option key={method} value={method}>
                  {t(`mergeMethods.${method}`)}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-base-content/60">
              {t(`mergeMethods.${mergeMethod}Description`)}
            </p>
          </div>
        )}

        {shownMergeMethod && !showMergeMethodPicker && (
          <div className="mb-4 text-sm text-base-content/70">
            <span className="font-medium">
              {t('bulkActionModal.mergeMethod')}:
            </span>{' '}
            <span className="badge badge-outline badge-sm align-middle">
              {t(`mergeMethods.${shownMergeMethod}`)}
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
                onClick={requestClose}
                className="btn btn-ghost"
                disabled={isExecuting}
              >
                {t('bulkActionModal.cancel')}
              </button>
              <button
                type="button"
                onClick={handleConfirmClick}
                className={confirmBtnClass}
                disabled={isExecuting || !onConfirm}
              >
                {t(`prGroupDetail.${actionType}`, { count: total })}
              </button>
            </>
          )}
          {hasStarted && !isComplete && (
            <button
              type="button"
              onClick={requestClose}
              className="btn btn-ghost"
            >
              {t('bulkActionModal.minimize')}
            </button>
          )}
          {isComplete && (
            <button
              type="button"
              onClick={requestClose}
              className="btn btn-primary"
            >
              {t('bulkActionModal.closeBtn')}
            </button>
          )}
        </div>
      </div>
      <form method="dialog" className="modal-backdrop">
        <button type="submit" aria-label={t('bulkActionModal.ariaClose')}>
          {t('bulkActionModal.closeBtn')}
        </button>
      </form>
    </dialog>
  );
}
