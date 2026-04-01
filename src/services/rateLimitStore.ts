/**
 * Represents the current state of the GitHub GraphQL API rate limit.
 * Used to track the remaining quota and when it will be refreshed.
 */
export interface RateLimitState {
  /** The maximum number of requests permitted per hour. */
  limit: number;
  /** The number of requests remaining in the current rate limit window. */
  remaining: number;
  /** The time at which the current rate limit window resets, in UTC epoch seconds. */
  reset: number; // Unix timestamp in seconds
}

type Listener = (state: RateLimitState) => void;

/**
 * A lightweight Pub/Sub store to manage and distribute GitHub API rate limit state.
 *
 * This decoupled architecture allows the Relay network layer to update the quota
 * asynchronously (e.g., from `X-RateLimit` headers) while UI components can subscribe
 * to reactively display the current status without prop drilling.
 */
class RateLimitStore {
  private state: RateLimitState = {
    limit: 5000,
    remaining: 5000,
    reset: Date.now() / 1000 + 3600, // Default to 1 hour from now
  };
  private listeners: Set<Listener> = new Set();

  /**
   * Retrieves the current rate limit state synchronously.
   * Useful for initial renders or one-off checks where a subscription is unnecessary.
   *
   * @returns The current `RateLimitState`.
   */
  getState() {
    return this.state;
  }

  /**
   * Updates the internal rate limit state from raw string values (e.g., HTTP headers).
   *
   * @param limit - The total rate limit capacity as a string.
   * @param remaining - The remaining quota as a string.
   * @param reset - The Unix timestamp (in seconds) for the quota reset as a string.
   *
   * @remarks
   * If any parameter is falsy, the update is silently aborted to prevent partial state corruption.
   * Successfully parsed values will immediately trigger a notification to all active subscribers.
   */
  update(limit: string | null, remaining: string | null, reset: string | null) {
    if (!limit || !remaining || !reset) return;

    this.state = {
      limit: parseInt(limit, 10),
      remaining: parseInt(remaining, 10),
      reset: parseInt(reset, 10),
    };

    this.notify();
  }

  /**
   * Subscribes a listener to rate limit state changes.
   *
   * @param listener - A callback function that receives the updated `RateLimitState`.
   * @returns A teardown function to unsubscribe the listener and prevent memory leaks.
   */
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

/**
 * The global singleton instance of the RateLimitStore.
 * Shared across the application to ensure a single source of truth for API quotas.
 */
export const rateLimitStore = new RateLimitStore();
