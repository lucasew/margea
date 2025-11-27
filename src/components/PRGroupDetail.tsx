import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Package, GitBranch, Tag, ExternalLink, Calendar, User, GitCommit, X, Check, AlertCircle } from 'react-feather';
import { PRGroup, BulkActionType, BulkActionProgress } from '../types';
import { BulkActionsService } from '../services/bulkActions';
import { BulkActionModal } from './BulkActionModal';
import { useAuth } from '../hooks/useAuth';

interface PRGroupDetailProps {
  group: PRGroup;
  onBack: () => void;
}

export function PRGroupDetail({ group, onBack }: PRGroupDetailProps) {
  const { t } = useTranslation();
  const { hasWritePermission, mode } = useAuth();
  const [selectedPRs, setSelectedPRs] = useState<Set<string>>(new Set());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [actionType, setActionType] = useState<BulkActionType | null>(null);
  const [progress, setProgress] = useState<BulkActionProgress[]>([]);
  const [isExecuting, setIsExecuting] = useState(false);

  const stateColors = {
    OPEN: 'badge-success',
    MERGED: 'badge-info',
    CLOSED: 'badge-error',
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleTogglePR = (prId: string) => {
    const newSelected = new Set(selectedPRs);
    if (newSelected.has(prId)) {
      newSelected.delete(prId);
    } else {
      newSelected.add(prId);
    }
    setSelectedPRs(newSelected);
  };

  const handleToggleAll = () => {
    if (selectedPRs.size === group.prs.length) {
      setSelectedPRs(new Set());
    } else {
      setSelectedPRs(new Set(group.prs.map(pr => pr.id)));
    }
  };

  const handleOpenModal = (type: BulkActionType) => {
    const selected = group.prs.filter(pr => selectedPRs.has(pr.id));
    setActionType(type);
    setProgress(
      selected.map(pr => ({
        prId: pr.id,
        prNumber: pr.number,
        prTitle: pr.title,
        status: 'pending',
      }))
    );
    setIsModalOpen(true);
  };

  const handleConfirm = async () => {
    setIsExecuting(true);
    const selected = group.prs.filter(pr => selectedPRs.has(pr.id));

    await BulkActionsService.executeBulkAction(
      selected,
      actionType!,
      (newProgress) => {
        setProgress(newProgress);
      }
    );

    setIsExecuting(false);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setActionType(null);
    setProgress([]);
    setIsExecuting(false);
    setSelectedPRs(new Set());
  };

  const selectedCount = selectedPRs.size;
  const allSelected = selectedCount === group.prs.length && group.prs.length > 0;

  return (
    <div className="w-full">
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Back Button */}
        <div className="mb-6">
          <button onClick={onBack} className="btn btn-ghost gap-2">
            <ArrowLeft size={20} />
            {t('prGroupDetail.backToGroups')}
          </button>
        </div>

        {/* Bulk Actions Bar */}
        <div className="border border-base-300 rounded-lg p-4 mb-6 bg-base-100">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="checkbox checkbox-primary"
                  checked={allSelected}
                  onChange={handleToggleAll}
                />
                <span className="font-semibold">
                  {selectedCount > 0
                    ? t('prGroupDetail.selectedPRs', { count: selectedCount })
                    : t('prGroupDetail.selectAll')}
                </span>
              </label>
              {mode && (
                <span className={`badge ${mode === 'write' ? 'badge-success' : 'badge-ghost'}`}>
                  {mode === 'write' ? t('prGroupDetail.readWrite') : t('prGroupDetail.readOnly')}
                </span>
              )}
            </div>

            {selectedCount > 0 && hasWritePermission && (
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => handleOpenModal('merge')}
                  className="btn btn-success gap-2"
                >
                  <Check size={16} />
                  {t('prGroupDetail.merge', { count: selectedCount })}
                </button>
                <button
                  onClick={() => handleOpenModal('close')}
                  className="btn btn-error gap-2"
                >
                  <X size={16} />
                  {t('prGroupDetail.close', { count: selectedCount })}
                </button>
              </div>
            )}

            {selectedCount > 0 && !hasWritePermission && (
              <div className="alert alert-warning py-2 px-4">
                <AlertCircle size={16} />
                <span className="text-sm">
                  {t('prGroupDetail.writePermissionRequired')}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Group Header */}
        <div className="border border-base-300 rounded-lg p-6 mb-8 bg-base-100">
          <div className="flex items-center gap-4 mb-6">
            <Package size={32} className="text-primary flex-shrink-0" />
            <h1 className="text-3xl md:text-4xl font-bold font-mono break-all">{group.package}</h1>
          </div>

            <div className="divider my-2"></div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-2 text-base-content/80">
                <GitBranch size={18} className="text-primary" />
                <span className="font-semibold">{t('prGroupDetail.branch')}</span>
                <span className="font-mono badge badge-outline">{group.baseRef}</span>
              </div>

              <div className="flex items-center gap-2 text-base-content/80">
                <GitCommit size={18} className="text-primary" />
                <span className="font-semibold">{t('prGroupDetail.total')}</span>
                <span className="badge badge-neutral">{group.count} PRs</span>
              </div>
            </div>

            {group.labels.length > 0 && (
              <>
                <div className="divider my-2"></div>
                <div className="flex flex-wrap gap-2 items-center">
                  <Tag size={18} className="text-base-content/60" />
                  <span className="font-semibold text-sm">{t('prGroupDetail.labels')}</span>
                  {group.labels.map((label) => (
                    <div key={label} className="badge badge-outline">
                      {label}
                    </div>
                  ))}
                </div>
              </>
            )}
        </div>

        {/* PRs List */}
        <div className="space-y-4">
          {group.prs.map((pr) => (
            <div key={pr.id} className={`border rounded-lg p-6 transition-all bg-base-100 ${selectedPRs.has(pr.id) ? 'border-primary border-2' : 'border-base-300 hover:border-primary/30'}`}>
                {/* PR Header */}
                <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-3 mb-4">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <input
                      type="checkbox"
                      className="checkbox checkbox-primary mt-1 flex-shrink-0"
                      checked={selectedPRs.has(pr.id)}
                      onChange={() => handleTogglePR(pr.id)}
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg md:text-xl font-bold break-words">
                        {pr.title}
                      </h3>
                      <div className="flex flex-wrap items-center gap-2 mt-2 text-sm text-base-content/70">
                        <span className="font-mono">{pr.repository.nameWithOwner}</span>
                        <span className="badge badge-sm badge-ghost">#{pr.number}</span>
                      </div>
                    </div>
                  </div>

                  <div className={`badge ${stateColors[pr.state]} badge-lg flex-shrink-0`}>
                    {pr.state}
                  </div>
                </div>

                <div className="divider my-2"></div>

                {/* PR Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-2 text-base-content/70">
                    <Calendar size={14} className="flex-shrink-0" />
                    <span className="truncate">
                      <span className="font-semibold">{t('prGroupDetail.createdAt')}</span> {formatDate(pr.createdAt)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-base-content/70">
                    <Calendar size={14} className="flex-shrink-0" />
                    <span className="truncate">
                      <span className="font-semibold">{t('prGroupDetail.updatedAt')}</span> {formatDate(pr.updatedAt)}
                    </span>
                  </div>

                  {pr.mergedAt && (
                    <div className="flex items-center gap-2 text-info">
                      <Calendar size={14} className="flex-shrink-0" />
                      <span className="truncate">
                        <span className="font-semibold">{t('prGroupDetail.mergedAt')}</span> {formatDate(pr.mergedAt)}
                      </span>
                    </div>
                  )}

                  {pr.closedAt && !pr.mergedAt && (
                    <div className="flex items-center gap-2 text-error">
                      <Calendar size={14} className="flex-shrink-0" />
                      <span className="truncate">
                        <span className="font-semibold">{t('prGroupDetail.closedAt')}</span> {formatDate(pr.closedAt)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Author */}
                {pr.author && (
                  <>
                    <div className="divider my-2"></div>
                    <div className="flex items-center gap-2">
                      <User size={16} className="text-base-content/60" />
                      <div className="avatar">
                        <div className="w-6 rounded-full">
                          <img src={pr.author.avatarUrl} alt={pr.author.login} />
                        </div>
                      </div>
                      <span className="text-sm font-mono">@{pr.author.login}</span>
                    </div>
                  </>
                )}

                {/* Labels */}
                {pr.labels?.nodes && pr.labels.nodes.length > 0 && (
                  <>
                    <div className="divider my-2"></div>
                    <div className="flex flex-wrap gap-2 items-center">
                      <Tag size={14} className="text-base-content/60" />
                      {pr.labels.nodes.map((label) => (
                        <div
                          key={label.id}
                          className="badge badge-sm"
                          style={{ backgroundColor: `#${label.color}`, color: '#fff' }}
                        >
                          {label.name}
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {/* Actions */}
                <div className="flex justify-end mt-4">
                  <a
                    href={pr.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-primary btn-sm gap-2"
                  >
                    <ExternalLink size={16} />
                    {t('prGroupDetail.openInGitHub')}
                  </a>
                </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bulk Action Modal */}
      <BulkActionModal
        isOpen={isModalOpen}
        actionType={actionType}
        progress={progress}
        isExecuting={isExecuting}
        onConfirm={handleConfirm}
        onCancel={handleCloseModal}
      />
    </div>
  );
}
