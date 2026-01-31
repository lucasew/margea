import { useEffect, useState } from 'react';
import { Activity } from 'react-feather';
import { rateLimitStore, RateLimitState } from '../services/rateLimitStore';

export function RateLimitIndicator() {
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

  // Calculate percentage (0 to 100)
  // Avoid division by zero
  const percentage = state.limit > 0
    ? Math.min(100, Math.max(0, Math.round((state.remaining / state.limit) * 100)))
    : 0;

  // Determine color based on percentage
  let colorClass = 'text-success';
  if (percentage < 20) colorClass = 'text-error';
  else if (percentage < 50) colorClass = 'text-warning';

  return (
    <div className="dropdown dropdown-end">
      <div
        tabIndex={0}
        role="button"
        className="btn btn-ghost btn-circle"
        aria-label="API Rate Limit Status"
      >
        <div
          className={`radial-progress ${colorClass}`}
          style={{
            '--value': percentage,
            '--size': '2rem',
            '--thickness': '3px'
          } as any}
        >
          <span className="text-[10px] font-bold text-base-content opacity-70">
            {percentage}
          </span>
        </div>
      </div>
      <div
        tabIndex={0}
        className="dropdown-content z-[1] card card-compact w-64 p-2 shadow bg-base-100 text-base-content border border-base-200 mt-2"
      >
        <div className="card-body">
          <h3 className="card-title text-sm flex items-center gap-2">
            <Activity size={16} />
            GitHub API Quota
          </h3>
          <div className="py-2 space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="opacity-70">Remaining:</span>
              <span className={`font-mono font-bold ${colorClass}`}>
                {state.remaining} / {state.limit}
              </span>
            </div>
            <progress
              className={`progress w-full ${percentage < 20 ? 'progress-error' : percentage < 50 ? 'progress-warning' : 'progress-success'}`}
              value={percentage}
              max="100"
            />
            <div className="flex justify-between items-center text-xs">
              <span className="opacity-70">Resets in:</span>
              <span className="font-mono">{timeUntilReset}</span>
            </div>
          </div>
          <div className="text-[10px] opacity-50 text-center pt-1">
            Updates automatically on every request
          </div>
        </div>
      </div>
    </div>
  );
}
