import { test, expect } from '@playwright/test';
import { capabilityFromScopes } from '../src/services/auth';

/**
 * capabilityFromScopes maps classic OAuth / PAT scope lists to write gates.
 * Only `repo` and `public_repo` grant write; everything else is read.
 */
test.describe('capabilityFromScopes', () => {
  test('empty list is read', () => {
    expect(capabilityFromScopes([])).toBe('read');
  });

  test('repo grants write', () => {
    expect(capabilityFromScopes(['repo'])).toBe('write');
  });

  test('public_repo grants write', () => {
    expect(capabilityFromScopes(['public_repo'])).toBe('write');
  });

  test('repo among other scopes grants write', () => {
    expect(capabilityFromScopes(['read:user', 'repo', 'gist'])).toBe('write');
  });

  test('public_repo among other scopes grants write', () => {
    expect(capabilityFromScopes(['user', 'public_repo'])).toBe('write');
  });

  test('read-only scopes stay read', () => {
    expect(capabilityFromScopes(['read:user', 'user:email', 'gist'])).toBe(
      'read',
    );
  });

  test('unrelated or unknown scopes stay read', () => {
    expect(capabilityFromScopes(['admin:org', 'workflow', 'delete_repo'])).toBe(
      'read',
    );
  });

  test('substring lookalikes do not grant write', () => {
    expect(capabilityFromScopes(['repo:status', 'public_repo_extra'])).toBe(
      'read',
    );
    expect(capabilityFromScopes(['my_repo', 'repo_admin'])).toBe('read');
  });
});
