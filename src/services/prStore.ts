import { Environment } from 'relay-runtime';
import { PullRequest } from '../types';
import { fetchScopes, AdaptiveFetchState } from './prFetchService';
import { INITIAL_FETCH_DAYS, LOAD_MORE_DAYS } from '../constants';

const DAY_MS = 24 * 60 * 60 * 1000;

// ── Finite State Machine ──────────────────────────────────────────────
//
//  ┌───────┐  setSearchScopes   ┌─────────┐  onBatch   ┌───────────┐
//  │  idle  │ ────────────────▶ │ loading  │ ────────▶  │ streaming │
//  └───────┘                    └─────────┘             └───────────┘
//      ▲                             │                       │
//      │         onComplete          │      onComplete       │
//      ├─────────────────────────────┘◀──────────────────────┘
//      │
//      │  loadNextPage  ┌──────────────┐ onBatch ┌─────────────────┐
//      └──────────────▶ │ loading_more │ ──────▶ │ streaming_more  │
//                       └──────────────┘         └─────────────────┘
//                              │                         │
//                              └─────── onComplete ──────┘──▶ idle
//
//  error: reachable from loading | streaming | loading_more | streaming_more

export type FetchPhase =
  | 'idle'
  | 'loading'
  | 'streaming'
  | 'loading_more'
  | 'streaming_more'
  | 'error';

export interface PRStoreState {
  prMap: Map<string, PullRequest>;
  phase: FetchPhase;
  hasNextPage: boolean;
  searchQuery: string;
  error: Error | null;
}

// Derived convenience booleans for backward compatibility
export function isLoading(phase: FetchPhase): boolean {
  return phase === 'loading';
}

export function isFetchingNextPage(phase: FetchPhase): boolean {
  return (
    phase === 'streaming' ||
    phase === 'loading_more' ||
    phase === 'streaming_more'
  );
}

export function isBusy(phase: FetchPhase): boolean {
  return phase !== 'idle' && phase !== 'error';
}

// ── Valid transitions ─────────────────────────────────────────────────

type Transition = [from: FetchPhase, to: FetchPhase];

const VALID_TRANSITIONS: Transition[] = [
  // initial load
  ['idle', 'loading'],
  ['error', 'loading'],
  ['loading', 'streaming'],
  ['loading', 'idle'],
  ['loading', 'error'],
  ['streaming', 'idle'],
  ['streaming', 'error'],
  // load-more
  ['idle', 'loading_more'],
  ['loading_more', 'streaming_more'],
  ['loading_more', 'idle'],
  ['loading_more', 'error'],
  ['streaming_more', 'idle'],
  ['streaming_more', 'error'],
  // abort mid-flight restarts from any active phase
  ['streaming', 'loading'],
  ['loading_more', 'loading'],
  ['streaming_more', 'loading'],
];

function canTransition(from: FetchPhase, to: FetchPhase): boolean {
  return VALID_TRANSITIONS.some(([f, t]) => f === from && t === to);
}

// ── Store ─────────────────────────────────────────────────────────────

type Listener = () => void;

class PRStore {
  private state: PRStoreState = {
    prMap: new Map(),
    phase: 'idle',
    hasNextPage: false,
    searchQuery: '',
    error: null,
  };

  private listeners = new Set<Listener>();

  // Internal fetch bookkeeping
  private abortController: AbortController | null = null;
  private scopes: string[] = [];
  private scopeKey = '';
  private adaptiveStates = new Map<string, AdaptiveFetchState>();
  private environment: Environment | null = null;

  // ── React-compatible external store API ──────────────────────────

  getSnapshot = (): PRStoreState => this.state;

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  // ── Phase transitions ────────────────────────────────────────────

  private transition(next: FetchPhase) {
    if (this.state.phase === next) return;
    if (!canTransition(this.state.phase, next)) {
      // In production we silently ignore invalid transitions
      return;
    }
    this.state = { ...this.state, phase: next };
    this.notify();
  }

  // ── Mutations ────────────────────────────────────────────────────

  private patch(partial: Partial<PRStoreState>) {
    this.state = { ...this.state, ...partial };
    this.notify();
  }

  private mergeBatch(prs: PullRequest[]) {
    const next = new Map(this.state.prMap);
    for (const pr of prs) {
      next.set(pr.id, pr);
    }
    this.state = { ...this.state, prMap: next };
    this.notify();
  }

  private notify() {
    for (const fn of this.listeners) fn();
  }

  // ── Public actions ───────────────────────────────────────────────

  setEnvironment(env: Environment) {
    this.environment = env;
  }

  setSearchScopes(scopes: string[]) {
    const newKey = scopes.slice().sort().join('\n');
    if (newKey === this.scopeKey) return;
    this.scopeKey = newKey;
    this.scopes = scopes;

    const syntheticQuery =
      scopes.length > 0 ? `is:pr ${scopes.join(' or ')}` : '';
    this.patch({ searchQuery: syntheticQuery });

    if (scopes.length === 0) {
      this.patch({
        prMap: new Map(),
        hasNextPage: false,
        phase: 'idle',
      });
      return;
    }

    const now = new Date();
    const start = new Date(now.getTime() - INITIAL_FETCH_DAYS * DAY_MS);
    this.startFetch(scopes, now, start, null, false, true);
  }

  setSearchQuery(query: string) {
    const scope = query.replace(/^is:pr\s+/, '');
    if (scope) this.setSearchScopes([scope]);
  }

  refresh() {
    if (this.scopes.length === 0) return;
    const now = new Date();
    const start = new Date(now.getTime() - INITIAL_FETCH_DAYS * DAY_MS);
    this.startFetch(this.scopes, now, start, null, false, false);
  }

  loadNextPage() {
    if (isBusy(this.state.phase) || this.scopes.length === 0) return;

    const states = this.adaptiveStates;
    if (states.size === 0) return;

    const oldestDates = Array.from(states.values()).map((s) =>
      s.oldestFetchedDate.getTime(),
    );
    const minOldest = new Date(Math.min(...oldestDates));
    const newStart = new Date(minOldest.getTime() - LOAD_MORE_DAYS * DAY_MS);

    this.startFetch(this.scopes, new Date(), newStart, states, true, false);
  }

  optimisticUpdate(prId: string, changes: Partial<PullRequest>) {
    if (!this.state.prMap.has(prId)) return;
    const next = new Map(this.state.prMap);
    next.set(prId, { ...next.get(prId)!, ...changes });
    this.patch({ prMap: next });
  }

  removePR(prId: string) {
    if (!this.state.prMap.has(prId)) return;
    const next = new Map(this.state.prMap);
    next.delete(prId);
    this.patch({ prMap: next });
  }

  // ── Internal fetch orchestration ─────────────────────────────────

  private startFetch(
    scopes: string[],
    endDate: Date,
    startDate: Date,
    savedStates: Map<string, AdaptiveFetchState> | null,
    isLoadMore: boolean,
    clearExisting: boolean,
  ) {
    if (!this.environment) return;

    // Abort any in-flight fetch
    if (this.abortController) {
      this.abortController.abort();
    }

    if (clearExisting) {
      this.patch({ prMap: new Map() });
    }

    if (!isLoadMore) {
      this.adaptiveStates = new Map();
    }

    // Transition into the right loading phase
    const nextPhase: FetchPhase = isLoadMore ? 'loading_more' : 'loading';
    this.patch({ phase: nextPhase, error: null });

    const controller = fetchScopes(
      this.environment,
      scopes,
      endDate,
      startDate,
      savedStates,
      {
        onBatch: (prs) => {
          this.mergeBatch(prs);

          // First batch arrives → transition to streaming
          const { phase } = this.state;
          if (phase === 'loading') {
            this.transition('streaming');
          } else if (phase === 'loading_more') {
            this.transition('streaming_more');
          }
        },

        onScopeProgress: () => {
          // Progress is implicit in phase + prMap size
        },

        onComplete: (results, states) => {
          states.forEach((state, scope) => {
            this.adaptiveStates.set(scope, state);
          });

          const totalNew = results.reduce((sum, r) => sum + r.fetched, 0);
          const hasMore = isLoadMore ? totalNew > 0 : true;

          const errors = results.filter((r) => r.error !== null);
          if (errors.length > 0) {
            const scopeNames = errors.map((e) => e.scope).join(', ');
            this.patch({
              phase: 'error',
              hasNextPage: hasMore,
              error: new Error(
                `Failed to fetch PRs for: ${scopeNames}. ${errors[0].error?.message ?? ''}`,
              ),
            });
            return;
          }

          this.patch({
            phase: 'idle',
            hasNextPage: hasMore,
          });
        },
      },
    );

    this.abortController = controller;
  }
}

export const prStore = new PRStore();
