export const PR_STATES = ['ALL', 'OPEN', 'CLOSED', 'MERGED'] as const;
export type PRState = (typeof PR_STATES)[number];

// PRList constants
export const BATCH_SIZE = 100;

/** Milliseconds in one day (used for fetch windows and adaptive intervals). */
export const DAY_MS = 24 * 60 * 60 * 1000;
// Adaptive fetch: initial load covers this many days
export const INITIAL_FETCH_DAYS = 7;
// Each "load more" extends backwards by this many days
export const LOAD_MORE_DAYS = 7;

export const API_ROUTES = {
  AUTH_TOKEN: '/api/auth/token',
  AUTH_LOGOUT: '/api/auth/logout',
  AUTH_PAT: '/api/auth/pat',
  AUTH_GITHUB: '/api/auth/github',
} as const;

export const APP_ROUTES = {
  HOME: '/',
  ORGS: '/orgs',
  ORG_DETAIL: '/org/:owner',
  REPO_DETAIL: '/:owner/:repo',
} as const;

export const URL_SEARCH_PARAMS = {
  GROUP: 'group',
  REPO: 'repo',
  STATE: 'state',
  AUTHOR: 'author',
  OWNER: 'owner',
  GROUP_BY: 'group_by',
  SORT_BY: 'sort_by',
} as const;

export const GROUPING_STRATEGIES = {
  renovate: 'renovate',
  repository: 'repository',
  author: 'author',
  agents: 'agents',
} as const;

export const SORT_STRATEGIES = {
  count: 'count',
  updated: 'updated',
  oldest: 'oldest',
  name: 'name',
  ci_failures: 'ci_failures',
  repos: 'repos',
  created: 'created',
} as const;

export const DEFAULT_SORT_STRATEGY = SORT_STRATEGIES.count;

export const MERGE_METHODS = ['MERGE', 'SQUASH', 'REBASE'] as const;
/** Display order for split merge actions: rebase, squash, merge. */
export const MERGE_METHOD_ACTIONS = ['REBASE', 'SQUASH', 'MERGE'] as const;
export const DEFAULT_MERGE_METHOD = MERGE_METHODS[0];
export const MERGE_METHOD_STORAGE_KEY = 'margea_merge_method';

/** sessionStorage key prefix for PR list filter persistence (pathname appended). */
export const FILTERS_STORAGE_KEY_PREFIX = 'margea_filters_';

export const THEME_LIGHT = 'margea-light';
export const THEME_DARK = 'margea-dark';

/** localStorage key for the selected theme (SpaShell inline script must match). */
export const THEME_STORAGE_KEY = 'theme';

export const THEMES = {
  LIGHT: THEME_LIGHT,
  DARK: THEME_DARK,
} as const;

export type Theme = (typeof THEMES)[keyof typeof THEMES];

/** Client-side feature flag: effective access mode (clamped by token capability). */
export const EFFECTIVE_MODE_STORAGE_KEY = 'margea_effective_mode';

/** Migrate legacy daisyui theme names stored before the redesign. */
export function resolveTheme(
  stored: string | null,
  prefersDark: boolean,
): Theme {
  if (stored === THEME_LIGHT || stored === THEME_DARK) return stored;
  if (stored === 'light') return THEME_LIGHT;
  if (stored === 'dark') return THEME_DARK;
  return prefersDark ? THEME_DARK : THEME_LIGHT;
}
