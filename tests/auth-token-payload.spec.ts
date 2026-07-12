import { test, expect } from '@playwright/test';
import { sessionAuthFromJwtPayload } from '../src/pages/api/auth/token';

test.describe('sessionAuthFromJwtPayload', () => {
  test('accepts non-empty github_token with write mode', () => {
    expect(
      sessionAuthFromJwtPayload({ github_token: 'gho_abc', mode: 'write' }),
    ).toEqual({ token: 'gho_abc', mode: 'write' });
  });

  test('accepts read mode', () => {
    expect(
      sessionAuthFromJwtPayload({ github_token: 'gho_abc', mode: 'read' }),
    ).toEqual({ token: 'gho_abc', mode: 'read' });
  });

  test('defaults missing mode to read', () => {
    expect(sessionAuthFromJwtPayload({ github_token: 'gho_abc' })).toEqual({
      token: 'gho_abc',
      mode: 'read',
    });
  });

  test('coerces unknown mode strings to read', () => {
    expect(
      sessionAuthFromJwtPayload({ github_token: 'gho_abc', mode: 'admin' }),
    ).toEqual({ token: 'gho_abc', mode: 'read' });
  });

  test('rejects missing github_token', () => {
    expect(sessionAuthFromJwtPayload({ mode: 'read' })).toBeNull();
  });

  test('rejects empty github_token', () => {
    expect(
      sessionAuthFromJwtPayload({ github_token: '', mode: 'write' }),
    ).toBeNull();
  });

  test('rejects non-string github_token', () => {
    expect(
      sessionAuthFromJwtPayload({ github_token: 12345 as unknown as string }),
    ).toBeNull();
    expect(
      sessionAuthFromJwtPayload({
        github_token: { nested: true } as unknown as string,
      }),
    ).toBeNull();
  });
});
