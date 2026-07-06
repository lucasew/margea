import { jwtVerify } from 'jose';
import { parse } from 'cookie';
import { reportError } from '../../../utils/errorReporting';

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

    return new Response(
      JSON.stringify({
        token: payload.github_token,
        // Login-time label only (which OAuth path / PAT entry); client derives
        // real write capability from live token scopes (X-OAuth-Scopes), not this.
        mode: payload.mode || 'read',
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
