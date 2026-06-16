import {
  GitPullRequest,
  GitMerge,
  XCircle,
  CheckCircle,
  Folder,
} from 'react-feather';
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation();
  return (
    <div className="stats stats-vertical lg:stats-horizontal shadow-lg w-full mb-6 bg-base-100">
      <div className="stat place-items-center">
        <div className="stat-figure text-primary">
          <GitPullRequest size={40} />
        </div>
        <div className="stat-title">{t('prStats.total')}</div>
        <div className="stat-value text-primary">{stats.total}</div>
      </div>

      <div className="stat place-items-center">
        <div className="stat-figure text-success">
          <CheckCircle size={40} />
        </div>
        <div className="stat-title">{t('prStats.open')}</div>
        <div className="stat-value text-success">{stats.open}</div>
      </div>

      <div className="stat place-items-center">
        <div className="stat-figure text-info">
          <GitMerge size={40} />
        </div>
        <div className="stat-title">{t('prStats.merged')}</div>
        <div className="stat-value text-info">{stats.merged}</div>
      </div>

      <div className="stat place-items-center">
        <div className="stat-figure text-error">
          <XCircle size={40} />
        </div>
        <div className="stat-title">{t('prStats.closed')}</div>
        <div className="stat-value text-error">{stats.closed}</div>
      </div>

      <div className="stat place-items-center">
        <div className="stat-figure text-base-content">
          <Folder size={40} />
        </div>
        <div className="stat-title">{t('prStats.repositories')}</div>
        <div className="stat-value">{stats.repositories}</div>
      </div>
    </div>
  );
}
