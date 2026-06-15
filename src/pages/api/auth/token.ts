import { jwtVerify } from 'jose';
import { parse } from 'cookie';

export async function GET({ request }: { request: Request }) {
  // Parse cookies from header
  const cookieHeader = request.headers.get('cookie') || '';
  const cookies = parse(cookieHeader);
  const sessionCookie = cookies.session;

  if (!sessionCookie) {
    return new Response(JSON.stringify({ error: 'Not authenticated' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!import.meta.env.SESSION_SECRET) {
    return new Response(
      JSON.stringify({
        error: 'Server misconfigured: missing SESSION_SECRET. Copy .env.example → .env.local',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  try {
    const secret = new TextEncoder().encode(import.meta.env.SESSION_SECRET);
    const { payload } = await jwtVerify(sessionCookie, secret);

    return new Response(
      JSON.stringify({
        token: payload.github_token,
        mode: payload.mode || 'read', // Default: read-only
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      },
    );
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid session' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
