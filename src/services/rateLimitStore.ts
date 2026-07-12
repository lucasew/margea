export interface RateLimitState {
  limit: number | null;
  remaining: number | null;
  reset: number | null; // Unix timestamp in seconds
}

type Listener = (state: RateLimitState) => void;

const UNKNOWN_STATE: RateLimitState = {
  limit: null,
  remaining: null,
  reset: null,
};

function parseHeaderInt(value: string): number | null {
  const n = parseInt(value, 10);
  return Number.isFinite(n) ? n : null;
}

export class RateLimitStore {
  private state: RateLimitState = { ...UNKNOWN_STATE };
  private listeners: Set<Listener> = new Set();

  getState() {
    return this.state;
  }

  update(limit: string | null, remaining: string | null, reset: string | null) {
    if (!limit || !remaining || !reset) return;

    const parsedLimit = parseHeaderInt(limit);
    const parsedRemaining = parseHeaderInt(remaining);
    const parsedReset = parseHeaderInt(reset);

    if (
      parsedLimit === null ||
      parsedRemaining === null ||
      parsedReset === null
    ) {
      return;
    }

    this.state = {
      limit: parsedLimit,
      remaining: parsedRemaining,
      reset: parsedReset,
    };

    this.notify();
  }

  subscribe(listener: Listener) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach((listener) => listener(this.state));
  }
}

export const rateLimitStore = new RateLimitStore();
