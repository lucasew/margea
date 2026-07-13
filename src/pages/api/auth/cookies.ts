import { serialize } from 'cookie';
import { SignJWT } from 'jose';

/** Session cookie / JWT TTL: 7 days. */
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;
export const SESSION_JWT_EXPIRATION = '7d';

/** OAuth state cookie TTL: 5 minutes. */
export const OAUTH_STATE_MAX_AGE_SECONDS = 300;

export function buildSessionCookie(token: string, isHttps: boolean): string {
  return serialize('session', token, {
    httpOnly: true,
    path: '/',
    sameSite: 'strict',
    maxAge: SESSION_MAX_AGE_SECONDS,
    secure: isHttps,
  });
}

export function clearSessionCookie(isHttps: boolean): string {
  return serialize('session', '', {
    httpOnly: true,
    path: '/',
    sameSite: 'strict',
    maxAge: 0,
    secure: isHttps,
  });
}

export function buildOAuthStateCookie(
  stateToken: string,
  isHttps: boolean,
): string {
  return serialize('oauth_state', stateToken, {
    httpOnly: true,
    path: '/',
    sameSite: 'lax',
    maxAge: OAUTH_STATE_MAX_AGE_SECONDS,
    secure: isHttps,
  });
}

/** Clears oauth_state with the same attributes used when setting it. */
export function clearOAuthStateCookie(isHttps: boolean): string {
  return serialize('oauth_state', '', {
    httpOnly: true,
    path: '/',
    sameSite: 'lax',
    maxAge: 0,
    secure: isHttps,
  });
}

export async function signSessionJwt(
  payload: { github_token: string; mode: string },
  secret: Uint8Array,
): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(SESSION_JWT_EXPIRATION)
    .sign(secret);
}
