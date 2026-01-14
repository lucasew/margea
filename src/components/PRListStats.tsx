import { GitPullRequest, GitMerge, XCircle, CheckCircle, Folder } from 'react-feather';

interface PRListStatsProps {
  stats: {
    total: number;
    open: number;
    merged: number;
    closed: number;
    repositories: number;
  };
}

export function PRListStats({ stats }: PRListStatsProps) {
  return (
    <div className="stats stats-vertical lg:stats-horizontal shadow-lg w-full mb-6 bg-base-100">
      <div className="stat place-items-center">
        <div className="stat-figure text-primary">
          <GitPullRequest size={40} />
        </div>
        <div className="stat-title">Total PRs</div>
        <div className="stat-value text-primary">{stats.total}</div>
      </div>

      <div className="stat place-items-center">
        <div className="stat-figure text-success">
          <CheckCircle size={40} />
        </div>
        <div className="stat-title">Abertos</div>
        <div className="stat-value text-success">{stats.open}</div>
      </div>

      <div className="stat place-items-center">
        <div className="stat-figure text-info">
          <GitMerge size={40} />
        </div>
        <div className="stat-title">Merged</div>
        <div className="stat-value text-info">{stats.merged}</div>
      </div>

      <div className="stat place-items-center">
        <div className="stat-figure text-error">
          <XCircle size={40} />
        </div>
        <div className="stat-title">Fechados</div>
        <div className="stat-value text-error">{stats.closed}</div>
      </div>

      <div className="stat place-items-center">
        <div className="stat-figure text-base-content">
          <Folder size={40} />
        </div>
        <div className="stat-title">Repositórios</div>
        <div className="stat-value">{stats.repositories}</div>
      </div>
    </div>
  );
}
