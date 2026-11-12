import { test, expect, type Page } from '@playwright/test';

const EXAMPLE_PATH =
  '/b?p=github:lucasew/lucasew.github.io/340,agena/285,margea/440,pesquisarr/621&title=Dependency+sweep&description=Merge+when+green';

type PRVariables = {
  owner: string;
  name: string;
  number: number;
};

function makePRNode({ owner, name, number }: PRVariables) {
  return {
    __typename: 'PullRequest',
    id: `PR_${owner}_${name}_${number}`,
    number,
    title: `PR ${number}`,
    body: '',
    state: 'OPEN',
    additions: 1,
    deletions: 1,
    commits: {
      nodes: [
        {
          commit: {
            statusCheckRollup: { state: 'SUCCESS' },
          },
        },
      ],
    },
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-02T00:00:00Z',
    mergedAt: null,
    closedAt: null,
    url: `https://github.com/${owner}/${name}/pull/${number}`,
    baseRefName: 'main',
    headRefName: 'feature',
    author: { __typename: 'Bot', login: 'renovate', avatarUrl: '' },
    labels: { nodes: [] },
    repository: {
      __typename: 'Repository',
      id: `R_${owner}_${name}`,
      name,
      nameWithOwner: `${owner}/${name}`,
      owner: { __typename: 'User', login: owner },
    },
  };
}

async function mockAuthenticatedSession(page: Page) {
  await page.route('**/api/auth/token', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ token: 'test-token', mode: 'read' }),
    }),
  );

  await page.route('https://api.github.com/user', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ login: 'tester' }),
    }),
  );
}

async function mockGraphQL(
  page: Page,
  prLookup: (variables: PRVariables) => unknown,
) {
  await page.route('https://api.github.com/graphql', async (route) => {
    const request = route.request().postDataJSON() as {
      query: string;
      variables: PRVariables;
    };

    if (request.query.includes('query ViewerQuery')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            viewer: {
              login: 'tester',
              name: 'Tester',
              avatarUrl: '',
              organizations: { nodes: [] },
            },
          },
        }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          repository: {
            __typename: 'Repository',
            pullRequest: prLookup(request.variables),
          },
        },
      }),
    });
  });
}

test.describe('shared PR bundle view', () => {
  test('renders the custom title, description, and PR list', async ({
    page,
  }) => {
    await mockAuthenticatedSession(page);
    await mockGraphQL(page, (variables) => makePRNode(variables));

    await page.goto(EXAMPLE_PATH);

    await expect(
      page.getByRole('heading', { name: 'Dependency sweep' }),
    ).toBeVisible();
    await expect(page.getByText('Merge when green')).toBeVisible();

    for (const number of [340, 285, 440, 621]) {
      await expect(
        page.getByText(`PR ${number}`, { exact: true }),
      ).toBeVisible();
    }

    await expect(
      page.getByRole('link', { name: 'Open in GitHub' }),
    ).toHaveCount(4);
  });

  test('warns when a referenced PR cannot be loaded', async ({ page }) => {
    await mockAuthenticatedSession(page);
    await mockGraphQL(page, (variables) =>
      variables.number === 285 ? null : makePRNode(variables),
    );

    await page.goto(EXAMPLE_PATH);

    await expect(
      page.getByText('Could not load 1 pull request:'),
    ).toBeVisible();
    await expect(page.getByText('lucasew/agena#285')).toBeVisible();
    await expect(page.getByText('PR 340', { exact: true })).toBeVisible();
  });
});
