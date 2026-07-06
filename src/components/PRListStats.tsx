import { useTranslation } from 'react-i18next';
import type { PRStats } from '../services/prStats';

interface PRListStatsProps {
  stats: PRStats;
  totalStats?: PRStats;
  hasActiveFilters?: boolean;
}

export function PRListStats({
  stats,
  totalStats,
  hasActiveFilters = false,
}: PRListStatsProps) {
  const { t } = useTranslation();
  const showTotals = hasActiveFilters && totalStats != null;

  const items = [
    {
      key: 'total',
      value: stats.total,
      totalValue: totalStats?.total,
      label: t('prStats.total'),
      tone: 'text-base-content',
    },
    {
      key: 'open',
      value: stats.open,
      totalValue: totalStats?.open,
      label: t('prStats.open'),
      tone: 'text-success',
    },
    {
      key: 'merged',
      value: stats.merged,
      totalValue: totalStats?.merged,
      label: t('prStats.merged'),
      tone: 'text-info',
    },
    {
      key: 'closed',
      value: stats.closed,
      totalValue: totalStats?.closed,
      label: t('prStats.closed'),
      tone: 'text-error',
    },
    {
      key: 'repos',
      value: stats.repositories,
      totalValue: totalStats?.repositories,
      label: t('prStats.repositories'),
      tone: 'text-base-content',
    },
  ] as const;

  return (
    <div
      className="flex flex-wrap justify-center gap-[clamp(0.5rem,2vw,1.25rem)] mb-[clamp(1rem,2.5vw,1.5rem)]"
      role="region"
      aria-label={t('prStats.regionLabel')}
    >
      {items.map((item) => {
        const showSplit = showTotals && item.totalValue != null;
        const ariaLabel = showSplit
          ? t('prStats.filteredOfTotal', {
              filtered: item.value,
              total: item.totalValue,
              label: item.label,
            })
          : `${item.value} ${item.label}`;

        return (
          <div
            key={item.key}
            className={`stat-chip min-w-[5.5rem] flex-1 basis-[clamp(5.5rem,12vw,9rem)] justify-center text-center ${
              showSplit ? 'max-w-[13rem]' : 'max-w-[11rem]'
            }`}
            aria-label={ariaLabel}
          >
            <div>
              <div className={`stat-chip-value ${item.tone}`}>
                {showSplit ? (
                  <>
                    <span>{item.value}</span>
                    <span className="stat-chip-total">
                      {' '}
                      / {item.totalValue}
                    </span>
                  </>
                ) : (
                  item.value
                )}
              </div>
              <div className="stat-chip-label">{item.label}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
