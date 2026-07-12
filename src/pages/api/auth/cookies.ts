import { SignJWT } from 'jose';

/** Session cookie / JWT TTL: 7 days. */
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;
export const SESSION_JWT_EXPIRATION = '7d';

/** OAuth state cookie TTL: 5 minutes. */
export const OAUTH_STATE_MAX_AGE_SECONDS = 300;

export function buildSessionCookie(token: string, isHttps: boolean): string {
  return `session=${token}; HttpOnly; ${isHttps ? 'Secure; ' : ''}SameSite=Strict; Max-Age=${SESSION_MAX_AGE_SECONDS}; Path=/`;
}

export function clearSessionCookie(isHttps: boolean): string {
  return `session=; HttpOnly; ${isHttps ? 'Secure; ' : ''}SameSite=Strict; Max-Age=0; Path=/`;
}

export function buildOAuthStateCookie(
  stateToken: string,
  isHttps: boolean,
): string {
  return `oauth_state=${stateToken}; HttpOnly; ${
    isHttps ? 'Secure; ' : ''
  }Path=/; SameSite=Lax; Max-Age=${OAUTH_STATE_MAX_AGE_SECONDS}`;
}

/** Clears oauth_state. Attribute set matches existing callback behavior (no Secure/SameSite). */
export function clearOAuthStateCookie(): string {
  return `oauth_state=; HttpOnly; Path=/; Max-Age=0`;
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
