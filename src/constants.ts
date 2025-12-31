export const PR_STATES = ['ALL', 'OPEN', 'CLOSED', 'MERGED'] as const;
export type PRState = (typeof PR_STATES)[number];

export const PR_STATE_LABELS: { [key in PRState]: string } = {
  ALL: 'Todos',
  OPEN: 'Abertos',
  MERGED: 'Merged',
  CLOSED: 'Fechados',
};

// PRList constants
export const DEFAULT_PR_TARGET = 100;
export const MAX_PR_TARGET = 1000;
export const BATCH_SIZE = 100;
