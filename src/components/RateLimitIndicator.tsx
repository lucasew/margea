import { Suspense, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Activity, Eye, Edit, User } from 'react-feather';
import { rateLimitStore, RateLimitState } from '../services/rateLimitStore';
import { useViewer } from '../hooks/useViewer';

interface RateLimitIndicatorProps {
  avatarUrl?: string | null;
  avatarAlt?: string;
  currentMode?: 'read' | 'write' | null;
  onChangePermissions?: () => void;
  onLogout?: () => void;
}

function RateLimitRing({
  percentage,
  colorClass,
  avatarUrl,
  avatarAlt,
  ariaLabel,
}: {
  percentage: number;
  colorClass: string;
  avatarUrl?: string | null;
  avatarAlt?: string;
  ariaLabel: string;
}) {
  return (
    <div
      tabIndex={0}
      role="button"
      className="btn btn-ghost btn-circle p-0 min-h-0 h-9 w-9"
      aria-label={ariaLabel}
    >
      <div
        className={`radial-progress ${colorClass}`}
        style={
          {
            '--value': percentage,
            '--size': '2rem',
            '--thickness': '3px',
          } as React.CSSProperties
        }
      >
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={avatarAlt ?? ''}
            className="w-[1.35rem] h-[1.35rem] rounded-full object-cover"
          />
        ) : (
          <User size={14} className="text-base-content/60" aria-hidden />
        )}
      </div>
    </div>
  );
}

export function RateLimitIndicator({
  avatarUrl,
  avatarAlt,
  currentMode,
  onChangePermissions,
  onLogout,
}: RateLimitIndicatorProps = {}) {
  const { t } = useTranslation();
  const [state, setState] = useState<RateLimitState>(rateLimitStore.getState());
  const [timeUntilReset, setTimeUntilReset] = useState<string>('');

  useEffect(() => {
    return rateLimitStore.subscribe(setState);
  }, []);

  useEffect(() => {
    const updateTimer = () => {
      const now = Date.now() / 1000;
      const diff = state.reset - now;

      if (diff <= 0) {
        setTimeUntilReset('Now');
        return;
      }

      const minutes = Math.floor(diff / 60);
      const seconds = Math.floor(diff % 60);
      setTimeUntilReset(`${minutes}m ${seconds}s`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [state.reset]);

  const percentage =
    state.limit > 0
      ? Math.min(
          100,
          Math.max(0, Math.round((state.remaining / state.limit) * 100)),
        )
      : 0;

  let colorClass = 'text-success';
  if (percentage < 20) colorClass = 'text-error';
  else if (percentage < 50) colorClass = 'text-warning';

  const progressClass =
    percentage < 20
      ? 'progress-error'
      : percentage < 50
        ? 'progress-warning'
        : 'progress-success';

  return (
    <div className="dropdown dropdown-end">
      <RateLimitRing
        percentage={percentage}
        colorClass={colorClass}
        avatarUrl={avatarUrl}
        avatarAlt={avatarAlt}
        ariaLabel={t('rateLimit.aria')}
      />
      <div
        tabIndex={0}
        className="dropdown-content z-50 mt-2 w-64 rounded-lg border border-base-300 bg-base-100 p-3 shadow-none"
      >
        {(currentMode || onChangePermissions || onLogout) && (
          <div className="mb-3 space-y-2 pb-3 border-b border-base-300">
            {currentMode && (
              <div className="flex items-center gap-2 text-sm">
                {currentMode === 'read' ? (
                  <Eye size={14} className="text-base-content/60" aria-hidden />
                ) : (
                  <Edit size={14} className="text-primary" aria-hidden />
                )}
                <span className="font-medium">
                  {currentMode === 'read'
                    ? t('permissions.read')
                    : t('permissions.write')}
                </span>
              </div>
            )}
            {onChangePermissions && (
              <button
                type="button"
                onClick={onChangePermissions}
                className="btn btn-ghost btn-xs justify-start w-full font-normal"
              >
                {t('permissions.change')}
              </button>
            )}
            {onLogout && (
              <button
                type="button"
                onClick={onLogout}
                className="btn btn-ghost btn-xs justify-start w-full font-normal"
              >
                {t('header.logout')}
              </button>
            )}
          </div>
        )}

        <h3 className="text-xs font-semibold flex items-center gap-1.5 mb-2 text-base-content/80">
          <Activity size={14} aria-hidden />
          {t('rateLimit.title')}
        </h3>
        <div className="space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="text-base-content/60">{t('rateLimit.remaining')}</span>
            <span className={`font-mono font-semibold tabular-nums ${colorClass}`}>
              {state.remaining} / {state.limit}
            </span>
          </div>
          <progress
            className={`progress w-full h-1.5 ${progressClass}`}
            value={percentage}
            max={100}
          />
          <div className="flex justify-between items-center text-xs">
            <span className="text-base-content/60">{t('rateLimit.resetsIn')}</span>
            <span className="font-mono tabular-nums">{timeUntilReset}</span>
          </div>
        </div>
        <p className="text-[10px] text-base-content/45 text-center pt-2">
          {t('rateLimit.updates')}
        </p>
      </div>
    </div>
  );
}

/** Authenticated variant: loads viewer avatar via Relay (must be under Suspense + Relay). */
function UserAccountMenuInner({
  currentMode,
  onChangePermissions,
  onLogout,
}: {
  currentMode?: 'read' | 'write' | null;
  onChangePermissions?: () => void;
  onLogout?: () => void;
}) {
  const { viewer } = useViewer();
  return (
    <RateLimitIndicator
      avatarUrl={viewer.avatarUrl}
      avatarAlt={viewer.login}
      currentMode={currentMode}
      onChangePermissions={onChangePermissions}
      onLogout={onLogout}
    />
  );
}

export function UserAccountMenu({
  currentMode,
  onChangePermissions,
  onLogout,
}: {
  currentMode?: 'read' | 'write' | null;
  onChangePermissions?: () => void;
  onLogout?: () => void;
}) {
  return (
    <Suspense
      fallback={
        <RateLimitIndicator
          currentMode={currentMode}
          onChangePermissions={onChangePermissions}
          onLogout={onLogout}
        />
      }
    >
      <UserAccountMenuInner
        currentMode={currentMode}
        onChangePermissions={onChangePermissions}
        onLogout={onLogout}
      />
    </Suspense>
  );
}
