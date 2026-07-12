import { jwtVerify, type JWTPayload } from 'jose';
import { parse } from 'cookie';
import { reportError } from '../../../utils/errorReporting';

/** Session claims returned to the client after successful JWT verify. */
export type SessionAuthClaims = {
  token: string;
  mode: 'read' | 'write';
};

/**
 * Validate JWT payload shape for /api/auth/token.
 * Returns null when claims are unusable (caller should treat as invalid session).
 */
export function sessionAuthFromJwtPayload(
  payload: JWTPayload,
): SessionAuthClaims | null {
  const githubToken = payload.github_token;
  if (typeof githubToken !== 'string' || githubToken.length === 0) {
    return null;
  }

  // Login-time label only; coerce anything other than write → read.
  const mode: 'read' | 'write' = payload.mode === 'write' ? 'write' : 'read';

  return { token: githubToken, mode };
}

export async function GET({ request }: { request: Request }) {
  // Parse cookies from header
  const cookieHeader = request.headers.get('cookie') || '';
  const cookies = parse(cookieHeader);
  const sessionCookie = cookies.session;

  if (!sessionCookie) {
    // Sentry will report error to unhandled console errors when playwright tests run which will fail the test
    // So we don't report this error.
    return new Response(JSON.stringify({ error: 'Not authenticated' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!import.meta.env.SESSION_SECRET) {
    reportError(new Error('Server misconfigured: missing SESSION_SECRET'), {
      context: 'github auth token GET',
    });
    return new Response(
      JSON.stringify({
        error:
          'Server misconfigured: missing SESSION_SECRET. Copy .env.example → .env.local',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }

  try {
    const secret = new TextEncoder().encode(import.meta.env.SESSION_SECRET);
    const { payload } = await jwtVerify(sessionCookie, secret);
    const claims = sessionAuthFromJwtPayload(payload);
    if (!claims) {
      throw new Error('Invalid session payload');
    }

    return new Response(
      JSON.stringify({
        token: claims.token,
        // Login-time label only (which OAuth path / PAT entry); client derives
        // real write capability from live token scopes (X-OAuth-Scopes), not this.
        mode: claims.mode,
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      },
    );
  } catch (error) {
    reportError(error, {
      context: 'github auth token GET jwt verify',
    });
    return new Response(JSON.stringify({ error: 'Invalid session' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
