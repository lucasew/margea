export interface RateLimitState {
  limit: number;
  remaining: number;
  reset: number; // Unix timestamp in seconds
}

type Listener = (state: RateLimitState) => void;

class RateLimitStore {
  private state: RateLimitState = {
    limit: 5000,
    remaining: 5000,
    reset: Date.now() / 1000 + 3600, // Default to 1 hour from now
  };
  private listeners: Set<Listener> = new Set();

  getState() {
    return this.state;
  }

  update(limit: string | null, remaining: string | null, reset: string | null) {
    if (!limit || !remaining || !reset) return;

    this.state = {
      limit: parseInt(limit, 10),
      remaining: parseInt(remaining, 10),
      reset: parseInt(reset, 10),
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
