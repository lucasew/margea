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

  const items = [
    { key: 'total', value: stats.total, label: t('prStats.total'), tone: 'text-base-content' },
    { key: 'open', value: stats.open, label: t('prStats.open'), tone: 'text-success' },
    { key: 'merged', value: stats.merged, label: t('prStats.merged'), tone: 'text-info' },
    { key: 'closed', value: stats.closed, label: t('prStats.closed'), tone: 'text-error' },
    {
      key: 'repos',
      value: stats.repositories,
      label: t('prStats.repositories'),
      tone: 'text-base-content',
    },
  ] as const;

  return (
    <div
      className="flex flex-wrap justify-center gap-[clamp(0.5rem,2vw,1.25rem)] mb-[clamp(1rem,2.5vw,1.5rem)]"
      role="region"
      aria-label={t('prStats.total')}
    >
      {items.map((item) => (
        <div
          key={item.key}
          className="stat-chip min-w-[5.5rem] flex-1 basis-[clamp(5.5rem,12vw,9rem)] max-w-[11rem] justify-center text-center"
        >
          <div>
            <div className={`stat-chip-value ${item.tone}`}>{item.value}</div>
            <div className="stat-chip-label">{item.label}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
