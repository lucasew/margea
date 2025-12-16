import { Package, GitBranch, Tag, User } from 'react-feather';
import { useTranslation } from 'react-i18next';
import { PRGroup } from '../types';

interface PRGroupCardProps {
  group: PRGroup;
  onExpand: (group: PRGroup) => void;
}

export function PRGroupCard({ group, onExpand }: PRGroupCardProps) {
  const { t } = useTranslation();
  const states = group.prs.reduce((acc, pr) => {
    acc[pr.state] = (acc[pr.state] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const repoCount = new Set(group.prs.map(pr => pr.repository.nameWithOwner)).size;
  const author = group.prs[0]?.author;

  return (
    <div
      className="border border-base-300 rounded-lg p-6 hover:border-primary/50 transition-all cursor-pointer bg-base-100"
      onClick={() => onExpand(group)}
    >
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-3 flex-1">
            <Package size={20} className="text-primary flex-shrink-0" />
            <h3 className="font-mono text-base lg:text-lg font-bold break-all">{group.package}</h3>
          </div>
          <div className="badge badge-neutral badge-lg flex-shrink-0">{group.count}</div>
        </div>

        {author && (
          <div className="flex items-center gap-2 mb-3">
            {author.avatarUrl ? (
              <img
                src={author.avatarUrl}
                alt={author.login}
                className="w-5 h-5 rounded-full"
              />
            ) : (
              <User size={16} className="text-base-content/60" />
            )}
            <span className="text-sm text-base-content/70 font-medium">{author.login}</span>
          </div>
        )}

        <div className="divider my-1"></div>

        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2 text-base-content/70">
            <GitBranch size={16} className="flex-shrink-0" />
            <span className="truncate">
              <span className="font-semibold">{t('prGroupCard.base')}:</span> <span className="font-mono">{group.baseRef}</span>
            </span>
          </div>

          {group.labels.length > 0 && (
            <div className="flex items-start gap-2">
              <Tag size={16} className="text-base-content/60 flex-shrink-0 mt-0.5" />
              <div className="flex flex-wrap gap-1 flex-1">
                {group.labels.map((label) => (
                  <div key={label} className="badge badge-sm badge-outline">
                    {label}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="divider my-1"></div>

        {/* Progress Bar com cores por estado */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-base-content/70 font-medium">
            <span>{t('prGroupCard.prStatus')}</span>
            {repoCount > 1 && (
              <span className="text-base-content/50">{repoCount} {t('prGroupCard.repos')}</span>
            )}
          </div>

          <div className="flex h-4 w-full rounded-full overflow-hidden bg-base-300">
            {states.OPEN && (
              <div
                className="bg-success flex items-center justify-center text-[10px] font-bold text-success-content"
                style={{ width: `${(states.OPEN / group.count) * 100}%` }}
                title={`${t('prGroupCard.open')}: ${states.OPEN}`}
              >
                {states.OPEN > 0 && <span className="px-1">{states.OPEN}</span>}
              </div>
            )}
            {states.MERGED && (
              <div
                className="bg-info flex items-center justify-center text-[10px] font-bold text-info-content"
                style={{ width: `${(states.MERGED / group.count) * 100}%` }}
                title={`${t('prGroupCard.merged')}: ${states.MERGED}`}
              >
                {states.MERGED > 0 && <span className="px-1">{states.MERGED}</span>}
              </div>
            )}
            {states.CLOSED && (
              <div
                className="bg-error flex items-center justify-center text-[10px] font-bold text-error-content"
                style={{ width: `${(states.CLOSED / group.count) * 100}%` }}
                title={`${t('prGroupCard.closed')}: ${states.CLOSED}`}
              >
                {states.CLOSED > 0 && <span className="px-1">{states.CLOSED}</span>}
              </div>
            )}
          </div>

          <div className="flex gap-3 text-xs">
            {states.OPEN && (
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-success"></div>
                <span className="text-base-content/60">{t('prGroupCard.open')}: {states.OPEN}</span>
              </div>
            )}
            {states.MERGED && (
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-info"></div>
                <span className="text-base-content/60">{t('prGroupCard.merged')}: {states.MERGED}</span>
              </div>
            )}
            {states.CLOSED && (
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-error"></div>
                <span className="text-base-content/60">{t('prGroupCard.closed')}: {states.CLOSED}</span>
              </div>
            )}
          </div>
        </div>
    </div>
  );
}
