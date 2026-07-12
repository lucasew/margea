import { test, expect } from '@playwright/test';
import {
  buildOAuthStateCookie,
  clearOAuthStateCookie,
} from '../src/pages/api/auth/cookies';

test.describe('oauth_state cookie helpers', () => {
  test('clear uses same Secure/SameSite/Path/HttpOnly as set when HTTPS', () => {
    const set = buildOAuthStateCookie('token', true);
    const clear = clearOAuthStateCookie(true);

    expect(set).toContain('Secure');
    expect(set).toContain('SameSite=Lax');
    expect(set).toContain('HttpOnly');
    expect(set).toContain('Path=/');

    expect(clear).toBe(
      'oauth_state=; HttpOnly; Secure; Path=/; SameSite=Lax; Max-Age=0',
    );
    expect(clear).toContain('Secure');
    expect(clear).toContain('SameSite=Lax');
    expect(clear).toContain('HttpOnly');
    expect(clear).toContain('Path=/');
    expect(clear).toContain('Max-Age=0');
  });

  test('clear omits Secure when not HTTPS, still matches set attrs', () => {
    const set = buildOAuthStateCookie('token', false);
    const clear = clearOAuthStateCookie(false);

    expect(set).not.toContain('Secure');
    expect(clear).toBe(
      'oauth_state=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0',
    );
    expect(clear).not.toContain('Secure');
    expect(clear).toContain('SameSite=Lax');
  });
});
