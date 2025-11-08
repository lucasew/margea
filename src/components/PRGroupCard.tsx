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

  return (
    <div className="card bg-base-100 shadow-md hover:shadow-lg transition-shadow cursor-pointer" onClick={() => onExpand(group)}>
      <div className="card-body">
        <h2 className="card-title flex items-center gap-2">
          <Package size={20} className="text-primary" />
          <span className="font-mono text-primary flex-1">{group.package}</span>
          <div className="badge badge-neutral">{group.count} PR{group.count > 1 ? 's' : ''}</div>
        </h2>

        <div className="text-sm text-base-content/70">
          <p className="flex items-center gap-2">
            <GitBranch size={16} />
            Branch base: <span className="font-mono">{group.baseRef}</span>
          </p>
          {group.labels.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2 items-center">
              <Tag size={14} className="text-base-content/60" />
              {group.labels.map((label) => (
                <div key={label} className="badge badge-sm badge-outline">
                  {label}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card-actions justify-end mt-2">
          {Object.entries(states).map(([state, count]) => (
            <div key={state} className={`badge ${stateColors[state as keyof typeof stateColors]}`}>
              {state.toLowerCase()}: {count}
            </div>
          ))}
        </div>

        <div className="text-xs text-base-content/50 mt-2">
          Repositórios: {new Set(group.prs.map(pr => pr.repository.nameWithOwner)).size}
        </div>
      </div>
    </div>
  );
}
