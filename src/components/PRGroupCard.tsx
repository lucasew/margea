import { GitBranch, User } from 'react-feather';
import { useTranslation } from 'react-i18next';
import { KeyboardEvent } from 'react';
import { PRGroup } from '../types';
import { CiStatusChart } from './CiStatusChart';
import { summarizeCiStatus } from '../services/ciStatus';
import { calculateStats } from '../services/prStats';

interface PRGroupCardProps {
  group: PRGroup;
  onExpand: (group: PRGroup) => void;
}

export function PRGroupCard({ group, onExpand }: PRGroupCardProps) {
  const { t } = useTranslation();
  const stats = calculateStats(group.prs);
  const author = group.prs[0]?.author;
  const { counts: ciStatusCounts, tooltip: ciTooltip } = summarizeCiStatus(
    group.prs,
    t,
  );
  const stateSegments = [
    {
      key: 'open',
      count: stats.open,
      color: 'bg-success',
      label: t('prGroupCard.open'),
    },
    {
      key: 'merged',
      count: stats.merged,
      color: 'bg-info',
      label: t('prGroupCard.merged'),
    },
    {
      key: 'closed',
      count: stats.closed,
      color: 'bg-error',
      label: t('prGroupCard.closed'),
    },
  ];

  const borderTone =
    ciStatusCounts.failure > 0
      ? 'border-error/35'
      : ciStatusCounts.success === ciStatusCounts.total &&
          ciStatusCounts.total > 0
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
      <div className="flex items-start gap-2 mb-3">
        <h3 className="flex-1 min-w-0 font-mono text-sm font-semibold break-words leading-snug">
          {group.package}
        </h3>
        <div className="flex items-center gap-1.5 flex-shrink-0 self-start">
          {ciStatusCounts.total > 0 && (
            <div className="tooltip tooltip-left" data-tip={ciTooltip}>
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

      <div className="pr-card-body">
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

        <div className="space-y-1.5 text-xs text-base-content/70">
          <div className="flex items-center gap-1.5">
            <GitBranch size={13} className="flex-shrink-0" aria-hidden />
            <span className="truncate">
              <span className="text-base-content/50">
                {t('prGroupCard.base')}:
              </span>{' '}
              <span className="font-mono">{group.baseRef}</span>
            </span>
          </div>

          {group.labels.length > 0 && (
            <div className="flex flex-wrap gap-1 w-full min-w-0">
              {group.labels.map((label) => (
                <span key={label} className="badge badge-xs badge-outline">
                  {label}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="pr-card-status">
          <div className="flex justify-between text-[11px] text-base-content/55 font-medium">
            <span>{t('prGroupCard.prStatus')}</span>
            {stats.repositories > 1 && (
              <span>
                {stats.repositories} {t('prGroupCard.repos')}
              </span>
            )}
          </div>

          <div
            className="flex h-1.5 w-full rounded-full overflow-hidden bg-base-300"
            role="img"
            aria-label={stateSegments
              .map((seg) => `${seg.label}: ${seg.count}`)
              .join(', ')}
          >
            {stateSegments.map(({ key, count, color }) =>
              count > 0 ? (
                <div
                  key={key}
                  className={color}
                  style={{ width: `${(count / group.count) * 100}%` }}
                />
              ) : null,
            )}
          </div>

          <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-base-content/55">
            {stateSegments.map(({ key, count, color, label }) =>
              count > 0 ? (
                <span key={key} className="inline-flex items-center gap-1">
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${color}`}
                    aria-hidden
                  />
                  {label} {count}
                </span>
              ) : null,
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
