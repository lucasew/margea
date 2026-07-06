import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  Package,
  GitBranch,
  Tag,
  ExternalLink,
  Calendar,
  User,
  GitCommit,
  GitPullRequest,
  X,
  AlertCircle,
} from 'react-feather';
import { MERGE_METHOD_ACTIONS } from '../constants';
import { PRGroup, BulkActionType, MergeMethod } from '../types';
import { useAuth } from '../hooks/useAuth';
import { useBulkAction } from '../hooks/useBulkAction';
import { CiStatusChart } from './CiStatusChart';
import { countCiStatuses, formatCiStatusTooltip } from '../services/ciStatus';

interface PRGroupDetailProps {
  onClearGroup?: () => void;
  group: PRGroup;
  onBack: () => void;
}

const STATE_COLORS = {
  OPEN: 'badge-success',
  MERGED: 'badge-info',
  CLOSED: 'badge-error',
} as const;

export function PRGroupDetail({
  group,
  onBack,
  onClearGroup,
}: PRGroupDetailProps) {
  const { t, i18n } = useTranslation();
  const { currentMode, hasWritePermission } = useAuth();
  const { requestBulkAction } = useBulkAction();
  const [selectedPRs, setSelectedPRs] = useState<Set<string>>(() => new Set());

  const formatDate = (dateString: string) => {
    const lang = i18n.language || 'en';
    return new Date(dateString).toLocaleDateString(lang, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleTogglePR = (prId: string) => {
    setSelectedPRs((prev) => {
      const next = new Set(prev);
      if (next.has(prId)) next.delete(prId);
      else next.add(prId);
      return next;
    });
  };

  const handleToggleAll = () => {
    setSelectedPRs((prev) =>
      prev.size === group.prs.length
        ? new Set()
        : new Set(group.prs.map((pr) => pr.id)),
    );
  };

  const handleRequestAction = (
    type: BulkActionType,
    mergeMethod?: MergeMethod,
  ) => {
    const selected = group.prs.filter((pr) => selectedPRs.has(pr.id));
    requestBulkAction(
      selected,
      type,
      type === 'merge' && mergeMethod ? { mergeMethod } : undefined,
    );
    setSelectedPRs(new Set());
  };

  const selectedCount = selectedPRs.size;
  const allSelected =
    selectedCount === group.prs.length && group.prs.length > 0;

  const ciStatusCounts = countCiStatuses(group.prs);
  const ciTooltip = formatCiStatusTooltip(ciStatusCounts, {
    status: t('ci.status'),
    success: t('ci.success'),
    failure: t('ci.failure'),
    pending: t('ci.pending'),
  });

  const someSelected = selectedCount > 0 && !allSelected;

  return (
    <div className="w-full">
      <div className="mb-4 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="btn btn-ghost btn-sm gap-1.5 px-2"
        >
          <ArrowLeft size={16} aria-hidden />
          {t('prGroupDetail.backToGroups')}
        </button>

        {onClearGroup && (
          <button
            type="button"
            onClick={onClearGroup}
            className="btn btn-ghost btn-sm btn-square text-base-content/70 hover:text-base-content"
            aria-label={t('filters.clear')}
          >
            <X size={16} aria-hidden />
          </button>
        )}
      </div>

      <header className="mb-4">
        <div className="flex items-start gap-2.5 mb-2">
          <Package
            size={22}
            className="text-primary flex-shrink-0 mt-1"
            aria-hidden
          />
          <h1 className="flex-1 min-w-0 text-xl sm:text-2xl font-bold font-mono break-words leading-snug">
            {group.package}
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-base-content/75 mb-2">
          <span className="inline-flex items-center gap-1.5">
            <GitBranch size={14} className="text-primary" aria-hidden />
            <span className="font-mono badge badge-outline badge-sm">
              {group.baseRef}
            </span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <GitCommit size={14} className="text-primary" aria-hidden />
            {ciStatusCounts.total > 0 && (
              <span className="tooltip" data-tip={ciTooltip}>
                <CiStatusChart
                  success={ciStatusCounts.success}
                  failure={ciStatusCounts.failure}
                  pending={ciStatusCounts.pending}
                  size={16}
                  strokeWidth={2.5}
                />
              </span>
            )}
            <span className="badge badge-neutral badge-sm tabular-nums">
              {group.count} {t('common.prs')}
            </span>
          </span>
          {currentMode && (
            <span
              className={`badge badge-sm ${currentMode === 'write' ? 'badge-success' : 'badge-ghost'}`}
            >
              {currentMode === 'write'
                ? t('prGroupDetail.readWrite')
                : t('prGroupDetail.readOnly')}
            </span>
          )}
        </div>

        {group.labels.length > 0 && (
          <div className="flex flex-wrap gap-1.5 items-center mb-3">
            <Tag size={14} className="text-base-content/50" aria-hidden />
            {group.labels.map((label) => (
              <span key={label} className="badge badge-outline badge-sm">
                {label}
              </span>
            ))}
          </div>
        )}

        <div className="@container pt-3 border-t border-base-300">
          <div className="flex items-center gap-3 border border-transparent px-3.5 sm:px-4 min-h-8">
            <label className="flex items-center gap-2.5 cursor-pointer min-w-0 shrink">
              <input
                type="checkbox"
                className="checkbox checkbox-primary checkbox-sm flex-shrink-0"
                checked={allSelected}
                ref={(input) => {
                  if (input) input.indeterminate = someSelected;
                }}
                onChange={handleToggleAll}
              />
              <span className="text-sm font-medium truncate">
                {selectedCount > 0
                  ? t('prGroupDetail.selectedPRs', { count: selectedCount })
                  : t('prGroupDetail.selectAll')}
              </span>
            </label>

            {selectedCount > 0 && hasWritePermission && (
              <div className="ml-auto flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handleRequestAction('merge')}
                  className="btn btn-success btn-sm gap-1.5 @[36rem]:hidden"
                >
                  <GitPullRequest size={14} aria-hidden />
                  {t('prGroupDetail.merge', { count: selectedCount })}
                </button>

                <div
                  className="join join-horizontal hidden @[36rem]:inline-flex"
                  role="group"
                  aria-label={t('prGroupDetail.mergeActionsAria')}
                >
                  <span
                    className="btn btn-success btn-sm btn-square join-item pointer-events-none no-animation"
                    aria-hidden
                  >
                    <GitPullRequest size={14} />
                  </span>
                  {MERGE_METHOD_ACTIONS.map((method) => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => handleRequestAction('merge', method)}
                      className="btn btn-success btn-sm join-item"
                      title={t(`mergeMethods.${method}Description`)}
                      aria-label={t('prGroupDetail.mergeWithMethod', {
                        count: selectedCount,
                        method: t(`mergeMethods.${method}Short`),
                      })}
                    >
                      {t(`mergeMethods.${method}Short`)}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => handleRequestAction('close')}
                  className="btn btn-error btn-sm gap-1.5"
                >
                  <X size={14} aria-hidden />
                  {t('prGroupDetail.close', { count: selectedCount })}
                </button>
              </div>
            )}

            {selectedCount > 0 && !hasWritePermission && (
              <div
                role="alert"
                className="alert alert-warning py-1.5 px-3 text-sm ml-auto min-w-0"
              >
                <AlertCircle size={14} aria-hidden />
                <span className="truncate">
                  {t('prGroupDetail.writePermissionRequired')}
                </span>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="space-y-2.5">
        {group.prs.map((pr) => (
          <div
            key={pr.id}
            className={`rounded-lg border p-3.5 sm:p-4 bg-base-100 transition-colors ${
              selectedPRs.has(pr.id)
                ? 'border-primary'
                : 'border-base-300 hover:border-primary/30'
            }`}
          >
            <div className="flex flex-col md:flex-row md:items-start gap-2.5">
              <div className="flex items-start gap-2.5 flex-1 min-w-0">
                <input
                  type="checkbox"
                  className="checkbox checkbox-primary checkbox-sm mt-1 flex-shrink-0"
                  checked={selectedPRs.has(pr.id)}
                  onChange={() => handleTogglePR(pr.id)}
                />
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-semibold break-words leading-snug">
                    {pr.title}
                  </h3>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1 text-xs text-base-content/65">
                    <span className="font-mono">
                      {pr.repository.nameWithOwner}
                    </span>
                    <span className="badge badge-xs badge-ghost">
                      #{pr.number}
                    </span>
                    {pr.author && (
                      <span className="inline-flex items-center gap-1">
                        <User size={12} aria-hidden />
                        <span className="font-mono">@{pr.author.login}</span>
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1">
                      <Calendar size={12} aria-hidden />
                      {formatDate(pr.updatedAt)}
                    </span>
                    {pr.mergedAt && (
                      <span className="text-info">
                        {t('prGroupDetail.mergedAt')}: {formatDate(pr.mergedAt)}
                      </span>
                    )}
                    {pr.closedAt && !pr.mergedAt && (
                      <span className="text-error">
                        {t('prGroupDetail.closedAt')}: {formatDate(pr.closedAt)}
                      </span>
                    )}
                  </div>
                  {pr.labels?.nodes && pr.labels.nodes.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {pr.labels.nodes.map((label) => (
                        <span
                          key={label.id}
                          className="badge badge-xs"
                          style={{
                            backgroundColor: `#${label.color}`,
                            color: '#fff',
                          }}
                        >
                          {label.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center md:justify-end gap-2 flex-shrink-0 md:pl-2">
                <span
                  className="font-mono text-xs tabular-nums"
                  title={t('common.additionsDeletions')}
                >
                  <span className="text-success">+{pr.additions}</span>{' '}
                  <span className="text-error">-{pr.deletions}</span>
                </span>
                {pr.ciStatus && (
                  <span
                    className="tooltip"
                    data-tip={`${t('ci.status')}: ${pr.ciStatus}`}
                  >
                    <CiStatusChart
                      success={pr.ciStatus === 'SUCCESS' ? 1 : 0}
                      failure={pr.ciStatus === 'FAILURE' ? 1 : 0}
                      pending={pr.ciStatus === 'PENDING' ? 1 : 0}
                      size={16}
                      strokeWidth={2.5}
                    />
                  </span>
                )}
                <span className={`badge badge-sm ${STATE_COLORS[pr.state]}`}>
                  {pr.state}
                </span>
                <a
                  href={pr.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-ghost btn-xs gap-1 border border-base-300"
                >
                  <ExternalLink size={12} aria-hidden />
                  {t('prGroupDetail.openInGitHub')}
                </a>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
