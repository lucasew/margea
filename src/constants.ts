export const PR_STATES = ['ALL', 'OPEN', 'CLOSED', 'MERGED'] as const;
export type PRState = (typeof PR_STATES)[number];

export const PR_STATE_LABELS: { [key in PRState]: string } = {
  ALL: 'Todos',
  OPEN: 'Abertos',
  MERGED: 'Merged',
  CLOSED: 'Fechados',
};
