import { GitBranch, Package, Tag, User } from 'react-feather';
import { useTranslation } from 'react-i18next';
import { PRGroup } from '../types';
import { CiStatusChart } from './CiStatusChart';
import { KeyboardEvent } from 'react';

interface PRGroupCardProps {
  group: PRGroup;
  onExpand: (group: PRGroup) => void;
}

export function PRGroupCard({ group, onExpand }: PRGroupCardProps) {
  const { t } = useTranslation();
  const states = group.prs.reduce(
    (acc, pr) => {
      acc[pr.state] = (acc[pr.state] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  const repoCount = new Set(group.prs.map((pr) => pr.repository.nameWithOwner))
    .size;
  const author = group.prs[0]?.author;

  const ciStatusCounts = group.prs.reduce(
    (acc, pr) => {
      if (pr.ciStatus === 'SUCCESS') acc.success++;
      if (pr.ciStatus === 'FAILURE') acc.failure++;
      if (pr.ciStatus === 'PENDING') acc.pending++;
      return acc;
    },
    { success: 0, failure: 0, pending: 0 },
  );

  const totalCiStatus =
    ciStatusCounts.success + ciStatusCounts.failure + ciStatusCounts.pending;

  const getTooltipContent = () => {
    const parts = [];
    if (ciStatusCounts.success > 0)
      parts.push(`${ciStatusCounts.success} ${t('ci.success')}`);
    if (ciStatusCounts.failure > 0)
      parts.push(`${ciStatusCounts.failure} ${t('ci.failure')}`);
    if (ciStatusCounts.pending > 0)
      parts.push(`${ciStatusCounts.pending} ${t('ci.pending')}`);
    return `${t('ci.status')}: ${parts.join(', ')}`;
  };

  const borderTone =
    ciStatusCounts.failure > 0
      ? 'border-error/35'
      : ciStatusCounts.success === totalCiStatus && totalCiStatus > 0
        ? 'border-success/35'
        : '';

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onExpand(group);
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      className={`pr-card ${borderTone}`}
      onClick={() => onExpand(group)}
      onKeyDown={handleKeyDown}
      aria-label={`${group.package}, ${group.count} PRs`}
    >
      <div className="flex justify-between items-start gap-2 mb-3">
        <div className="flex items-start gap-2 flex-1 min-w-0">
          <Package
            size={16}
            className="text-primary flex-shrink-0 mt-0.5"
            aria-hidden
          />
          <h3 className="font-mono text-sm font-semibold break-all leading-snug">
            {group.package}
          </h3>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {totalCiStatus > 0 && (
            <div
              className="tooltip tooltip-left"
              data-tip={getTooltipContent()}
            >
              <CiStatusChart
                success={ciStatusCounts.success}
                failure={ciStatusCounts.failure}
                pending={ciStatusCounts.pending}
                size={18}
                strokeWidth={2.5}
              />
            </div>
          )}
          <span className="badge badge-sm badge-neutral tabular-nums">
            {group.count}
          </span>
        </div>
      </div>

      {author && (
        <div className="flex items-center gap-1.5 mb-2.5">
          {author.avatarUrl ? (
            <img
              src={author.avatarUrl}
              alt=""
              className="w-4 h-4 rounded-full"
            />
          ) : (
            <User size={14} className="text-base-content/55" aria-hidden />
          )}
          <span className="text-xs text-base-content/65">{author.login}</span>
        </div>
      )}

      <div className="space-y-1.5 text-xs text-base-content/70 mb-3">
        <div className="flex items-center gap-1.5">
          <GitBranch size={13} className="flex-shrink-0" aria-hidden />
          <span className="truncate">
            <span className="text-base-content/50">{t('prGroupCard.base')}:</span>{' '}
            <span className="font-mono">{group.baseRef}</span>
          </span>
        </div>

        {group.labels.length > 0 && (
          <div className="flex items-start gap-1.5">
            <Tag
              size={13}
              className="text-base-content/50 flex-shrink-0 mt-0.5"
              aria-hidden
            />
            <div className="flex flex-wrap gap-1 flex-1">
              {group.labels.map((label) => (
                <span key={label} className="badge badge-xs badge-outline">
                  {label}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="space-y-1.5">
        <div className="flex justify-between text-[11px] text-base-content/55 font-medium">
          <span>{t('prGroupCard.prStatus')}</span>
          {repoCount > 1 && (
            <span>
              {repoCount} {t('prGroupCard.repos')}
            </span>
          )}
        </div>

        <div
          className="flex h-1.5 w-full rounded-full overflow-hidden bg-base-300"
          role="img"
          aria-label={`${t('prGroupCard.open')}: ${states.OPEN || 0}, ${t('prGroupCard.merged')}: ${states.MERGED || 0}, ${t('prGroupCard.closed')}: ${states.CLOSED || 0}`}
        >
          {states.OPEN ? (
            <div
              className="bg-success"
              style={{ width: `${(states.OPEN / group.count) * 100}%` }}
            />
          ) : null}
          {states.MERGED ? (
            <div
              className="bg-info"
              style={{ width: `${(states.MERGED / group.count) * 100}%` }}
            />
          ) : null}
          {states.CLOSED ? (
            <div
              className="bg-error"
              style={{ width: `${(states.CLOSED / group.count) * 100}%` }}
            />
          ) : null}
        </div>

        <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-base-content/55">
          {states.OPEN ? (
            <span className="inline-flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-success" aria-hidden />
              {t('prGroupCard.open')} {states.OPEN}
            </span>
          ) : null}
          {states.MERGED ? (
            <span className="inline-flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-info" aria-hidden />
              {t('prGroupCard.merged')} {states.MERGED}
            </span>
          ) : null}
          {states.CLOSED ? (
            <span className="inline-flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-error" aria-hidden />
              {t('prGroupCard.closed')} {states.CLOSED}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}
