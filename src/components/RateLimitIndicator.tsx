import { Suspense, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Activity, Eye, Edit, User } from 'react-feather';
import { rateLimitStore, RateLimitState } from '../services/rateLimitStore';
import { useAuth } from '../hooks/useAuth';
import { useViewer } from '../hooks/useViewer';

interface RateLimitIndicatorProps {
  avatarUrl?: string | null;
  avatarAlt?: string;
  currentMode?: 'read' | 'write' | null;
  onToggleMode?: () => void;
  onLogout?: () => void;
  /** Token is read-only at OAuth/PAT level; toggle can't enable real writes. */
  modeToggleDisabled?: boolean;
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
  onToggleMode,
  onLogout,
  modeToggleDisabled = false,
}: RateLimitIndicatorProps = {}) {
  const { t } = useTranslation();
  const [state, setState] = useState<RateLimitState>(rateLimitStore.getState());
  const [timeUntilReset, setTimeUntilReset] = useState<string>('');
  const isWrite = currentMode === 'write';
  const isKnown =
    state.limit !== null && state.remaining !== null && state.reset !== null;

  useEffect(() => {
    return rateLimitStore.subscribe(setState);
  }, []);

  useEffect(() => {
    const resetAt = state.reset;
    if (resetAt === null) {
      setTimeUntilReset('—');
      return;
    }

    const updateTimer = () => {
      const now = Date.now() / 1000;
      const diff = resetAt - now;

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

  const limit = state.limit;
  const remaining = state.remaining;
  const percentage =
    limit !== null && remaining !== null && limit > 0
      ? Math.min(100, Math.max(0, Math.round((remaining / limit) * 100)))
      : 0;

  let colorClass = 'text-base-content/40';
  if (isKnown) {
    colorClass = 'text-success';
    if (percentage < 20) colorClass = 'text-error';
    else if (percentage < 50) colorClass = 'text-warning';
  }

  const progressClass = !isKnown
    ? ''
    : percentage < 20
      ? 'progress-error'
      : percentage < 50
        ? 'progress-warning'
        : 'progress-success';

  const remainingLabel = isKnown ? `${state.remaining} / ${state.limit}` : '—';

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
        {(currentMode || onToggleMode || onLogout) && (
          <div className="mb-3 space-y-2 pb-3 border-b border-base-300">
            {currentMode && onToggleMode && !modeToggleDisabled && (
              <label
                className="flex items-center justify-between gap-3 select-none cursor-pointer"
                title={
                  isWrite
                    ? t('permissions.switchToRead')
                    : t('permissions.switchToWrite')
                }
              >
                <span className="flex items-center gap-2 text-sm min-w-0">
                  {isWrite ? (
                    <Edit
                      size={14}
                      className="text-primary flex-shrink-0"
                      aria-hidden
                    />
                  ) : (
                    <Eye
                      size={14}
                      className="text-base-content/60 flex-shrink-0"
                      aria-hidden
                    />
                  )}
                  <span className="font-medium truncate">
                    {isWrite ? t('permissions.write') : t('permissions.read')}
                  </span>
                </span>
                <input
                  type="checkbox"
                  className="toggle toggle-sm toggle-primary"
                  checked={isWrite}
                  onChange={onToggleMode}
                  aria-label={t('permissions.changeTitle')}
                />
              </label>
            )}
            {currentMode && (modeToggleDisabled || !onToggleMode) && (
              <div
                className="flex items-center gap-2 text-sm"
                title={
                  modeToggleDisabled
                    ? t('permissions.tokenReadOnly')
                    : undefined
                }
              >
                <Eye size={14} className="text-base-content/60" aria-hidden />
                <span className="font-medium">{t('permissions.read')}</span>
                {modeToggleDisabled && (
                  <span className="text-[10px] text-base-content/45 ml-auto">
                    {t('permissions.tokenReadOnlyShort')}
                  </span>
                )}
              </div>
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
            <span className="text-base-content/60">
              {t('rateLimit.remaining')}
            </span>
            <span
              className={`font-mono font-semibold tabular-nums ${colorClass}`}
            >
              {remainingLabel}
            </span>
          </div>
          {isKnown ? (
            <progress
              className={`progress w-full h-1.5 ${progressClass}`}
              value={percentage}
              max={100}
            />
          ) : (
            <div
              className="h-1.5 w-full rounded-full bg-base-300"
              aria-hidden
            />
          )}
          <div className="flex justify-between items-center text-xs">
            <span className="text-base-content/60">
              {t('rateLimit.resetsIn')}
            </span>
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
function UserAccountMenuInner() {
  const { viewer } = useViewer();
  const { currentMode, tokenCapability, toggleMode, logout } = useAuth();
  return (
    <RateLimitIndicator
      avatarUrl={viewer.avatarUrl}
      avatarAlt={viewer.login}
      currentMode={currentMode}
      onToggleMode={toggleMode}
      onLogout={logout}
      modeToggleDisabled={tokenCapability !== 'write'}
    />
  );
}

export function UserAccountMenu() {
  const { currentMode, tokenCapability, toggleMode, logout } = useAuth();
  const menuProps = {
    currentMode,
    onToggleMode: toggleMode,
    onLogout: logout,
    modeToggleDisabled: tokenCapability !== 'write',
  };

  return (
    <Suspense fallback={<RateLimitIndicator {...menuProps} />}>
      <UserAccountMenuInner />
    </Suspense>
  );
}
