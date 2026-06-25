export const PR_STATES = ['ALL', 'OPEN', 'CLOSED', 'MERGED'] as const;
export type PRState = (typeof PR_STATES)[number];

// PRList constants
export const DEFAULT_PR_TARGET = 100;
export const MAX_PR_TARGET = 1000;
export const BATCH_SIZE = 100;

// Adaptive fetch: initial load covers this many days
export const INITIAL_FETCH_DAYS = 7;
// Each "load more" extends backwards by this many days
export const LOAD_MORE_DAYS = 7;

export const URL_SEARCH_PARAMS = {
  GROUP: 'group',
  REPO: 'repo',
  STATE: 'state',
  AUTHOR: 'author',
  OWNER: 'owner',
  LIMIT: 'limit',
  GROUP_BY: 'group_by',
} as const;

export const GROUPING_STRATEGIES = {
  renovate: 'renovate',
  repository: 'repository',
  author: 'author',
  agents: 'agents',
} as const;

export const THEME_LIGHT = 'margea-light';
export const THEME_DARK = 'margea-dark';

export const THEMES = {
  LIGHT: THEME_LIGHT,
  DARK: THEME_DARK,
} as const;

/** Client-side feature flag: effective access mode (clamped by token capability). */
export const EFFECTIVE_MODE_STORAGE_KEY = 'margea_effective_mode';

/** Migrate legacy daisyui theme names stored before the redesign. */
export function resolveTheme(stored: string | null, prefersDark: boolean): string {
  if (stored === THEME_LIGHT || stored === THEME_DARK) return stored;
  if (stored === 'light') return THEME_LIGHT;
  if (stored === 'dark') return THEME_DARK;
  return prefersDark ? THEME_DARK : THEME_LIGHT;
}
