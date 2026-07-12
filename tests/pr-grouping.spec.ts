import { test, expect } from '@playwright/test';
import type { PullRequest } from '../src/types';
import { groupPullRequests } from '../src/services/prGrouping';

function makePR(id: string, overrides: Partial<PullRequest> = {}): PullRequest {
  return {
    id,
    number: 1,
    title: id,
    body: null,
    state: 'OPEN',
    additions: 0,
    deletions: 0,
    ciStatus: null,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    mergedAt: null,
    closedAt: null,
    url: `https://example.com/${id}`,
    baseRefName: 'main',
    headRefName: `b-${id}`,
    author: { login: 'bot', avatarUrl: '' },
    labels: null,
    repository: {
      id: 'repo',
      name: 'app',
      nameWithOwner: 'acme/app',
      owner: { login: 'acme' },
    },
    ...overrides,
  };
}

test.describe('groupPullRequests — renovate (default)', () => {
  test('groups by normalized title + author', () => {
    const prs = [
      makePR('a', {
        title: 'chore(deps): update dependency lodash to v4',
        author: { login: 'renovate', avatarUrl: '' },
        url: 'https://example.com/a',
      }),
      makePR('b', {
        title: 'chore(deps): update dependency lodash to v4',
        author: { login: 'renovate', avatarUrl: '' },
        url: 'https://example.com/b',
      }),
      makePR('c', {
        title: 'chore(deps): update dependency lodash to v4',
        author: { login: 'other-bot', avatarUrl: '' },
        url: 'https://example.com/c',
      }),
      makePR('d', {
        title: 'feat: something else',
        author: { login: 'renovate', avatarUrl: '' },
        url: 'https://example.com/d',
      }),
    ];

    const groups = groupPullRequests(prs, 'renovate');
    expect(groups).toHaveLength(3);

    const lodashRenovate = groups.find(
      (g) =>
        g.package === 'chore(deps): update dependency lodash to v4' &&
        g.key.endsWith('|renovate'),
    );
    expect(lodashRenovate?.count).toBe(2);
    expect(lodashRenovate?.prs.map((p) => p.id)).toEqual(['a', 'b']);

    const lodashOther = groups.find((g) => g.key.endsWith('|other-bot'));
    expect(lodashOther?.count).toBe(1);

    const feat = groups.find((g) => g.package === 'feat: something else');
    expect(feat?.count).toBe(1);
  });

  test('normalizes "Update dependency..." titles for grouping', () => {
    const prs = [
      makePR('old', {
        title: 'Update dependency lodash to v4',
        author: { login: 'renovate', avatarUrl: '' },
        url: 'https://example.com/old',
      }),
      makePR('new', {
        title: 'chore(deps): update dependency lodash to v4',
        author: { login: 'renovate', avatarUrl: '' },
        url: 'https://example.com/new',
      }),
    ];

    const groups = groupPullRequests(prs, 'renovate');
    expect(groups).toHaveLength(1);
    expect(groups[0].package).toBe(
      'chore(deps): update dependency lodash to v4',
    );
    expect(groups[0].key).toBe(
      'chore(deps): update dependency lodash to v4|renovate',
    );
    expect(groups[0].count).toBe(2);
  });

  test('does not rewrite titles that only contain "Update dependency" mid-string', () => {
    const prs = [
      makePR('mid', {
        title: 'Please Update dependency carefully',
        author: { login: 'bot', avatarUrl: '' },
      }),
    ];
    const groups = groupPullRequests(prs, 'renovate');
    expect(groups[0].package).toBe('Please Update dependency carefully');
  });

  test('normalizes master and main base refs on first PR in group', () => {
    const prs = [
      makePR('m1', {
        title: 'same title',
        author: { login: 'bot', avatarUrl: '' },
        baseRefName: 'master',
        url: 'https://example.com/m1',
      }),
      makePR('m2', {
        title: 'same title',
        author: { login: 'bot', avatarUrl: '' },
        baseRefName: 'main',
        url: 'https://example.com/m2',
      }),
    ];

    const groups = groupPullRequests(prs, 'renovate');
    expect(groups).toHaveLength(1);
    // baseRef comes from first PR; master is normalized to main
    expect(groups[0].baseRef).toBe('main');
    expect(groups[0].count).toBe(2);
  });

  test('preserves non-main/master base refs from first PR', () => {
    const groups = groupPullRequests(
      [
        makePR('d1', {
          title: 'develop pr',
          baseRefName: 'develop',
        }),
      ],
      'renovate',
    );
    expect(groups[0].baseRef).toBe('develop');
  });

  test('uses unknown author when author is missing', () => {
    const groups = groupPullRequests(
      [makePR('no-author', { title: 't', author: null })],
      'renovate',
    );
    expect(groups[0].key).toBe('t|unknown');
  });

  test('captures sorted labels from first PR in group', () => {
    const groups = groupPullRequests(
      [
        makePR('l1', {
          title: 'labeled',
          labels: {
            nodes: [
              {
                id: '2',
                name: 'zebra',
                color: '000',
                description: null,
              },
              {
                id: '1',
                name: 'alpha',
                color: 'fff',
                description: null,
              },
            ],
          },
        }),
      ],
      'renovate',
    );
    expect(groups[0].labels).toEqual(['alpha', 'zebra']);
  });

  test('defaults strategy to renovate when omitted', () => {
    const prs = [
      makePR('a', {
        title: 'Update dependency foo to v1',
        author: { login: 'renovate', avatarUrl: '' },
      }),
      makePR('b', {
        title: 'chore(deps): update dependency foo to v1',
        author: { login: 'renovate', avatarUrl: '' },
        url: 'https://example.com/b',
      }),
    ];
    const groups = groupPullRequests(prs);
    expect(groups).toHaveLength(1);
    expect(groups[0].package).toBe(
      'chore(deps): update dependency foo to v1',
    );
  });

  test('falls back to renovate for unknown strategy', () => {
    const prs = [
      makePR('a', {
        title: 'Update dependency bar to v2',
        author: { login: 'renovate', avatarUrl: '' },
      }),
      makePR('b', {
        title: 'chore(deps): update dependency bar to v2',
        author: { login: 'renovate', avatarUrl: '' },
        url: 'https://example.com/b',
      }),
    ];
    // Cast: runtime path for invalid strategy values
    const groups = groupPullRequests(prs, 'not-a-strategy' as 'renovate');
    expect(groups).toHaveLength(1);
    expect(groups[0].package).toBe(
      'chore(deps): update dependency bar to v2',
    );
  });
});

test.describe('groupPullRequests — repository', () => {
  test('groups by nameWithOwner', () => {
    const prs = [
      makePR('r1', {
        repository: {
          id: '1',
          name: 'one',
          nameWithOwner: 'acme/one',
          owner: { login: 'acme' },
        },
      }),
      makePR('r2', {
        url: 'https://example.com/r2',
        repository: {
          id: '1',
          name: 'one',
          nameWithOwner: 'acme/one',
          owner: { login: 'acme' },
        },
      }),
      makePR('r3', {
        url: 'https://example.com/r3',
        repository: {
          id: '2',
          name: 'two',
          nameWithOwner: 'acme/two',
          owner: { login: 'acme' },
        },
      }),
    ];

    const groups = groupPullRequests(prs, 'repository');
    expect(groups).toHaveLength(2);

    const one = groups.find((g) => g.key === 'acme/one');
    expect(one?.package).toBe('acme/one');
    expect(one?.count).toBe(2);

    const two = groups.find((g) => g.key === 'acme/two');
    expect(two?.count).toBe(1);
  });
});

test.describe('groupPullRequests — author', () => {
  test('groups by author login', () => {
    const prs = [
      makePR('a1', { author: { login: 'alice', avatarUrl: '' } }),
      makePR('a2', {
        url: 'https://example.com/a2',
        author: { login: 'alice', avatarUrl: '' },
      }),
      makePR('b1', {
        url: 'https://example.com/b1',
        author: { login: 'bob', avatarUrl: '' },
      }),
    ];

    const groups = groupPullRequests(prs, 'author');
    expect(groups).toHaveLength(2);

    const alice = groups.find((g) => g.key === 'alice');
    expect(alice?.package).toBe('alice');
    expect(alice?.count).toBe(2);

    const bob = groups.find((g) => g.key === 'bob');
    expect(bob?.count).toBe(1);
  });

  test('uses unknown when author is missing', () => {
    const prs = [
      makePR('n1', { author: null }),
      makePR('n2', { url: 'https://example.com/n2', author: null }),
      makePR('k1', {
        url: 'https://example.com/k1',
        author: { login: 'known', avatarUrl: '' },
      }),
    ];

    const groups = groupPullRequests(prs, 'author');
    expect(groups).toHaveLength(2);

    const unknown = groups.find((g) => g.key === 'unknown');
    expect(unknown?.package).toBe('unknown');
    expect(unknown?.count).toBe(2);
  });
});

test.describe('groupPullRequests — agents', () => {
  test('groups by leading non-BMP emoji', () => {
    // Robot face 🤖 is U+1F916 (non-BMP)
    const robot = '🤖';
    // Sparkles ✨ is U+2728 (BMP but > 255 and \p{Emoji})
    const sparkles = '✨';

    const prs = [
      makePR('e1', { title: `${robot} fix agent path` }),
      makePR('e2', {
        url: 'https://example.com/e2',
        title: `${robot} another agent task`,
      }),
      makePR('e3', {
        url: 'https://example.com/e3',
        title: `${sparkles} polish UI`,
      }),
    ];

    const groups = groupPullRequests(prs, 'agents');
    expect(groups).toHaveLength(2);

    const robotGroup = groups.find((g) => g.key === robot);
    expect(robotGroup?.package).toBe(robot);
    expect(robotGroup?.count).toBe(2);

    const sparklesGroup = groups.find((g) => g.key === sparkles);
    expect(sparklesGroup?.count).toBe(1);
  });

  test('uses (No emoji) for plain titles', () => {
    const prs = [
      makePR('p1', { title: 'plain title without emoji' }),
      makePR('p2', {
        url: 'https://example.com/p2',
        title: 'another plain one',
      }),
    ];

    const groups = groupPullRequests(prs, 'agents');
    expect(groups).toHaveLength(1);
    expect(groups[0].key).toBe('(No emoji)');
    expect(groups[0].package).toBe('(No emoji)');
    expect(groups[0].count).toBe(2);
  });

  test('does not treat ASCII as emoji even if emoji-like in title mid-string', () => {
    // Leading digit/letter must not form an emoji group
    const groups = groupPullRequests(
      [makePR('a1', { title: 'A starts with letter' })],
      'agents',
    );
    expect(groups[0].key).toBe('(No emoji)');
  });

  test('trims title before detecting leading emoji', () => {
    const rocket = '🚀';
    const groups = groupPullRequests(
      [makePR('t1', { title: `  ${rocket} trimmed` })],
      'agents',
    );
    expect(groups[0].key).toBe(rocket);
  });

  test('handles empty title as (No emoji)', () => {
    const groups = groupPullRequests(
      [makePR('empty', { title: '   ' })],
      'agents',
    );
    expect(groups[0].key).toBe('(No emoji)');
  });

  test('non-BMP emoji path (surrogate pair) groups correctly', () => {
    // Fire 🔥 U+1F525 — definitely requires surrogate pair in UTF-16
    const fire = '🔥';
    expect(fire.length).toBe(2); // surrogate pair in JS string length

    const groups = groupPullRequests(
      [
        makePR('f1', { title: `${fire} burn` }),
        makePR('f2', {
          url: 'https://example.com/f2',
          title: `${fire} more fire`,
        }),
      ],
      'agents',
    );
    expect(groups).toHaveLength(1);
    expect(groups[0].key).toBe(fire);
    expect(groups[0].count).toBe(2);
  });
});

test.describe('groupPullRequests — dedup', () => {
  test('same PR url appears once across strategies', () => {
    const sharedUrl = 'https://github.com/acme/app/pull/42';
    const first = makePR('keep', {
      title: 'Update dependency lodash to v4',
      author: { login: 'renovate', avatarUrl: '' },
      url: sharedUrl,
      baseRefName: 'master',
    });
    const duplicate = makePR('drop', {
      title: 'chore(deps): update dependency lodash to v4',
      author: { login: 'renovate', avatarUrl: '' },
      url: sharedUrl,
      baseRefName: 'main',
    });

    for (const strategy of [
      'renovate',
      'repository',
      'author',
      'agents',
    ] as const) {
      const groups = groupPullRequests([first, duplicate], strategy);
      const allPrs = groups.flatMap((g) => g.prs);
      expect(allPrs).toHaveLength(1);
      expect(allPrs[0].id).toBe('keep');
      expect(allPrs[0].url).toBe(sharedUrl);
    }
  });

  test('keeps first occurrence when urls collide', () => {
    const url = 'https://example.com/same';
    const groups = groupPullRequests(
      [
        makePR('first', { title: 't1', url }),
        makePR('second', { title: 't2', url }),
      ],
      'renovate',
    );
    expect(groups).toHaveLength(1);
    expect(groups[0].prs[0].id).toBe('first');
    expect(groups[0].package).toBe('t1');
  });
});
