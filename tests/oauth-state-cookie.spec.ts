import { test, expect } from '@playwright/test';
import {
  SESSION_MAX_AGE_SECONDS,
  OAUTH_STATE_MAX_AGE_SECONDS,
  buildSessionCookie,
  clearSessionCookie,
  buildOAuthStateCookie,
  clearOAuthStateCookie,
} from '../src/pages/api/auth/cookies';

/** Parse Set-Cookie attributes into a map for order-independent checks. */
function cookieAttrs(header: string): {
  name: string;
  value: string;
  flags: Set<string>;
  attrs: Record<string, string>;
} {
  const parts = header.split(';').map((p) => p.trim());
  const [nameValue, ...rest] = parts;
  const eq = nameValue.indexOf('=');
  const name = eq === -1 ? nameValue : nameValue.slice(0, eq);
  const value = eq === -1 ? '' : nameValue.slice(eq + 1);
  const flags = new Set<string>();
  const attrs: Record<string, string> = {};
  for (const part of rest) {
    const i = part.indexOf('=');
    if (i === -1) {
      flags.add(part.toLowerCase());
    } else {
      attrs[part.slice(0, i).toLowerCase()] = part.slice(i + 1);
    }
  }
  return { name, value, flags, attrs };
}

test.describe('oauth_state cookie helpers', () => {
  test('set/clear share Secure/SameSite/Path/HttpOnly when HTTPS', () => {
    const set = cookieAttrs(buildOAuthStateCookie('token', true));
    const clear = cookieAttrs(clearOAuthStateCookie(true));

    expect(set.name).toBe('oauth_state');
    expect(set.value).toBe('token');
    expect(set.flags.has('secure')).toBe(true);
    expect(set.flags.has('httponly')).toBe(true);
    expect(set.attrs.path).toBe('/');
    expect(set.attrs.samesite).toBe('Lax');
    expect(set.attrs['max-age']).toBe(String(OAUTH_STATE_MAX_AGE_SECONDS));

    expect(clear.name).toBe('oauth_state');
    expect(clear.value).toBe('');
    expect(clear.flags.has('secure')).toBe(true);
    expect(clear.flags.has('httponly')).toBe(true);
    expect(clear.attrs.path).toBe('/');
    expect(clear.attrs.samesite).toBe('Lax');
    expect(clear.attrs['max-age']).toBe('0');
  });

  test('clear omits Secure when not HTTPS, still matches set attrs', () => {
    const set = cookieAttrs(buildOAuthStateCookie('token', false));
    const clear = cookieAttrs(clearOAuthStateCookie(false));

    expect(set.flags.has('secure')).toBe(false);
    expect(clear.flags.has('secure')).toBe(false);
    expect(clear.flags.has('httponly')).toBe(true);
    expect(clear.attrs.path).toBe('/');
    expect(clear.attrs.samesite).toBe('Lax');
    expect(clear.attrs['max-age']).toBe('0');
  });
});

test.describe('session cookie helpers', () => {
  test('set/clear share Secure/SameSite/Path/HttpOnly when HTTPS', () => {
    const set = cookieAttrs(buildSessionCookie('jwt.token.value', true));
    const clear = cookieAttrs(clearSessionCookie(true));

    expect(set.name).toBe('session');
    expect(set.value).toBe('jwt.token.value');
    expect(set.flags.has('secure')).toBe(true);
    expect(set.flags.has('httponly')).toBe(true);
    expect(set.attrs.path).toBe('/');
    expect(set.attrs.samesite).toBe('Strict');
    expect(set.attrs['max-age']).toBe(String(SESSION_MAX_AGE_SECONDS));

    expect(clear.name).toBe('session');
    expect(clear.value).toBe('');
    expect(clear.flags.has('secure')).toBe(true);
    expect(clear.flags.has('httponly')).toBe(true);
    expect(clear.attrs.path).toBe('/');
    expect(clear.attrs.samesite).toBe('Strict');
    expect(clear.attrs['max-age']).toBe('0');
  });

  test('omits Secure when not HTTPS', () => {
    const set = cookieAttrs(buildSessionCookie('tok', false));
    const clear = cookieAttrs(clearSessionCookie(false));

    expect(set.flags.has('secure')).toBe(false);
    expect(clear.flags.has('secure')).toBe(false);
    expect(set.attrs.samesite).toBe('Strict');
    expect(clear.attrs.samesite).toBe('Strict');
    expect(set.attrs['max-age']).toBe(String(SESSION_MAX_AGE_SECONDS));
    expect(clear.attrs['max-age']).toBe('0');
  });
});
