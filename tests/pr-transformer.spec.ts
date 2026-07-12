import { test, expect } from '@playwright/test';
import { transformPR } from '../src/services/prTransformer';

type PRNode = Parameters<typeof transformPR>[0];
type StatusState = 'ERROR' | 'EXPECTED' | 'FAILURE' | 'PENDING' | 'SUCCESS';

/**
 * Minimal GraphQL PR node fixture for transformPR / isValidPR / getCIStatus.
 */
function makePRNode(
  overrides: Record<string, unknown> = {},
  options: { ciState?: StatusState | null | 'absent' } = {},
): PRNode {
  const { ciState = null } = options;

  let commits: unknown;
  if (ciState === 'absent') {
    commits = undefined;
  } else if (ciState === null) {
    commits = {
      nodes: [
        {
          commit: {
            statusCheckRollup: null,
          },
        },
      ],
    };
  } else {
    commits = {
      nodes: [
        {
          commit: {
            statusCheckRollup: { state: ciState },
          },
        },
      ],
    };
  }

  return {
    id: 'PR_kwDOA',
    number: 42,
    title: 'Bump foo',
    body: 'details',
    state: 'OPEN',
    additions: 3,
    deletions: 1,
    commits,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-02T00:00:00Z',
    mergedAt: null,
    closedAt: null,
    url: 'https://github.com/acme/app/pull/42',
    baseRefName: 'main',
    headRefName: 'dependabot/foo',
    author: {
      login: 'dependabot',
      avatarUrl: 'https://example.com/a.png',
    },
    labels: {
      nodes: [
        {
          id: 'L1',
          name: 'dependencies',
          color: '0366d6',
          description: 'deps',
        },
      ],
    },
    repository: {
      id: 'R_1',
      name: 'app',
      nameWithOwner: 'acme/app',
      owner: { login: 'acme' },
    },
    ...overrides,
  } as PRNode;
}

test.describe('transformPR', () => {
  test('returns null for null / undefined node', () => {
    expect(transformPR(null)).toBeNull();
    expect(transformPR(undefined)).toBeNull();
  });

  test('returns null when required fields are missing', () => {
    const required = [
      'id',
      'number',
      'title',
      'state',
      'createdAt',
      'updatedAt',
      'url',
      'baseRefName',
      'headRefName',
      'repository',
    ] as const;

    for (const field of required) {
      expect(
        transformPR(makePRNode({ [field]: null })),
        `null ${field}`,
      ).toBeNull();
      expect(
        transformPR(makePRNode({ [field]: undefined })),
        `undefined ${field}`,
      ).toBeNull();
    }

    expect(
      transformPR(
        makePRNode({
          repository: {
            id: 'R_1',
            name: 'app',
            nameWithOwner: 'acme/app',
            owner: null,
          },
        }),
      ),
    ).toBeNull();

    expect(
      transformPR(
        makePRNode({
          repository: {
            id: 'R_1',
            name: 'app',
            nameWithOwner: 'acme/app',
            owner: { login: null },
          },
        }),
      ),
    ).toBeNull();

    expect(
      transformPR(
        makePRNode({
          repository: {
            id: 'R_1',
            name: 'app',
            nameWithOwner: 'acme/app',
            owner: { login: '' },
          },
        }),
      ),
    ).toBeNull();
  });

  test('happy path maps GraphQL node into domain PullRequest', () => {
    const result = transformPR(makePRNode({}, { ciState: 'SUCCESS' }));

    expect(result).toEqual({
      id: 'PR_kwDOA',
      number: 42,
      title: 'Bump foo',
      body: 'details',
      state: 'OPEN',
      additions: 3,
      deletions: 1,
      ciStatus: 'SUCCESS',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-02T00:00:00Z',
      mergedAt: null,
      closedAt: null,
      url: 'https://github.com/acme/app/pull/42',
      baseRefName: 'main',
      headRefName: 'dependabot/foo',
      author: {
        login: 'dependabot',
        avatarUrl: 'https://example.com/a.png',
      },
      labels: {
        nodes: [
          {
            id: 'L1',
            name: 'dependencies',
            color: '0366d6',
            description: 'deps',
          },
        ],
      },
      repository: {
        id: 'R_1',
        name: 'app',
        nameWithOwner: 'acme/app',
        owner: { login: 'acme' },
      },
    });
  });

  test('normalizes nullable scalars and optional author/labels', () => {
    const result = transformPR(
      makePRNode({
        body: undefined,
        additions: null,
        deletions: undefined,
        mergedAt: '2026-01-03T00:00:00Z',
        closedAt: '2026-01-04T00:00:00Z',
        author: null,
        labels: null,
      }),
    );

    expect(result).not.toBeNull();
    expect(result!.body).toBeNull();
    expect(result!.additions).toBe(0);
    expect(result!.deletions).toBe(0);
    expect(result!.mergedAt).toBe('2026-01-03T00:00:00Z');
    expect(result!.closedAt).toBe('2026-01-04T00:00:00Z');
    expect(result!.author).toBeNull();
    expect(result!.labels).toBeNull();
  });

  test('filters null label nodes', () => {
    const result = transformPR(
      makePRNode({
        labels: {
          nodes: [
            null,
            {
              id: 'L2',
              name: 'security',
              color: 'ff0000',
              description: null,
            },
            undefined,
          ],
        },
      }),
    );

    expect(result!.labels).toEqual({
      nodes: [
        {
          id: 'L2',
          name: 'security',
          color: 'ff0000',
          description: null,
        },
      ],
    });
  });

  test.describe('ciStatus mapping', () => {
    test('SUCCESS → SUCCESS', () => {
      expect(
        transformPR(makePRNode({}, { ciState: 'SUCCESS' }))!.ciStatus,
      ).toBe('SUCCESS');
    });

    test('FAILURE → FAILURE', () => {
      expect(
        transformPR(makePRNode({}, { ciState: 'FAILURE' }))!.ciStatus,
      ).toBe('FAILURE');
    });

    test('ERROR → FAILURE', () => {
      expect(transformPR(makePRNode({}, { ciState: 'ERROR' }))!.ciStatus).toBe(
        'FAILURE',
      );
    });

    test('PENDING → PENDING', () => {
      expect(
        transformPR(makePRNode({}, { ciState: 'PENDING' }))!.ciStatus,
      ).toBe('PENDING');
    });

    test('EXPECTED → PENDING', () => {
      expect(
        transformPR(makePRNode({}, { ciState: 'EXPECTED' }))!.ciStatus,
      ).toBe('PENDING');
    });

    test('null statusCheckRollup → null', () => {
      expect(
        transformPR(makePRNode({}, { ciState: null }))!.ciStatus,
      ).toBeNull();
    });

    test('missing commits → null', () => {
      expect(
        transformPR(makePRNode({}, { ciState: 'absent' }))!.ciStatus,
      ).toBeNull();
    });

    test('empty commits.nodes → null', () => {
      expect(
        transformPR(makePRNode({ commits: { nodes: [] } }))!.ciStatus,
      ).toBeNull();
    });
  });
});
