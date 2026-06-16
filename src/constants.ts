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
} as const;

export const THEME_LIGHT = 'light';
export const THEME_DARK = 'dark';

export const THEMES = {
  LIGHT: THEME_LIGHT,
  DARK: THEME_DARK,
} as const;
