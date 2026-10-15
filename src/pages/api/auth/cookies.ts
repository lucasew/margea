import { parse, serialize } from 'cookie';
import { SignJWT, type JWTPayload } from 'jose';

/** Session cookie / JWT TTL: 7 days. */
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;
export const SESSION_JWT_EXPIRATION = '7d';

/** OAuth state cookie / JWT TTL: 5 minutes. */
export const OAUTH_STATE_MAX_AGE_SECONDS = 300;
export const OAUTH_STATE_JWT_EXPIRATION = `${OAUTH_STATE_MAX_AGE_SECONDS}s`;

type SameSite = 'strict' | 'lax';

export function parseRequestCookies(
  request: Request,
): Record<string, string | undefined> {
  return parse(request.headers.get('cookie') || '');
}

/**
 * Shared Set-Cookie builder for auth cookies.
 * Keeps httpOnly/path/secure attributes in one place so set/clear cannot drift.
 */
function serializeAuthCookie(
  name: string,
  value: string,
  {
    isHttps,
    sameSite,
    maxAge,
  }: { isHttps: boolean; sameSite: SameSite; maxAge: number },
): string {
  return serialize(name, value, {
    httpOnly: true,
    path: '/',
    sameSite,
    maxAge,
    secure: isHttps,
  });
}

export function buildSessionCookie(token: string, isHttps: boolean): string {
  return serializeAuthCookie('session', token, {
    isHttps,
    sameSite: 'strict',
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export function clearSessionCookie(isHttps: boolean): string {
  return serializeAuthCookie('session', '', {
    isHttps,
    sameSite: 'strict',
    maxAge: 0,
  });
}

export function buildOAuthStateCookie(
  stateToken: string,
  isHttps: boolean,
): string {
  return serializeAuthCookie('oauth_state', stateToken, {
    isHttps,
    sameSite: 'lax',
    maxAge: OAUTH_STATE_MAX_AGE_SECONDS,
  });
}

/** Clears oauth_state with the same attributes used when setting it. */
export function clearOAuthStateCookie(isHttps: boolean): string {
  return serializeAuthCookie('oauth_state', '', {
    isHttps,
    sameSite: 'lax',
    maxAge: 0,
  });
}

function signJwt(
  payload: JWTPayload,
  expirationTime: string,
  secret: Uint8Array,
): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expirationTime)
    .sign(secret);
}

export function signSessionJwt(
  payload: { github_token: string; mode: string },
  secret: Uint8Array,
): Promise<string> {
  return signJwt(payload, SESSION_JWT_EXPIRATION, secret);
}

export function signOAuthStateJwt(
  payload: { nonce: string; mode: 'read' | 'write' },
  secret: Uint8Array,
): Promise<string> {
  return signJwt(payload, OAUTH_STATE_JWT_EXPIRATION, secret);
}
