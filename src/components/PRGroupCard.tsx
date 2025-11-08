import { Package, GitBranch, Tag } from 'react-feather';
import { PRGroup } from '../types';

interface PRGroupCardProps {
  group: PRGroup;
  onExpand: (group: PRGroup) => void;
}

export function PRGroupCard({ group, onExpand }: PRGroupCardProps) {
  const stateColors = {
    OPEN: 'badge-success',
    MERGED: 'badge-info',
    CLOSED: 'badge-error',
  };

  const states = group.prs.reduce((acc, pr) => {
    acc[pr.state] = (acc[pr.state] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const repoCount = new Set(group.prs.map(pr => pr.repository.nameWithOwner)).size;

  return (
    <div
      className="card bg-base-100 shadow-md hover:shadow-xl transition-shadow cursor-pointer border border-base-300 hover:border-primary"
      onClick={() => onExpand(group)}
    >
      <div className="card-body">
        <h2 className="card-title justify-between items-start">
          <div className="flex items-center gap-2 flex-1">
            <Package size={20} className="text-primary flex-shrink-0" />
            <span className="font-mono text-sm lg:text-base break-all">{group.package}</span>
          </div>
          <div className="badge badge-neutral badge-lg flex-shrink-0">{group.count}</div>
        </h2>

        <div className="divider my-1"></div>

        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2 text-base-content/70">
            <GitBranch size={16} className="flex-shrink-0" />
            <span className="truncate">
              <span className="font-semibold">Base:</span> <span className="font-mono">{group.baseRef}</span>
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

        <div className="flex flex-wrap gap-2 justify-between items-center">
          <div className="flex flex-wrap gap-1">
            {Object.entries(states).map(([state, count]) => (
              <div key={state} className={`badge ${stateColors[state as keyof typeof stateColors]} badge-sm`}>
                {state}: {count}
              </div>
            ))}
          </div>

          {repoCount > 1 && (
            <div className="badge badge-ghost badge-sm">
              {repoCount} repos
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
