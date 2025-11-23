import { jwtVerify } from 'jose';

export const config = { runtime: 'edge' };

export default async function handler(req: Request) {
  // Parse cookies from header
  const cookieHeader = req.headers.get('cookie') || '';
  const cookies = Object.fromEntries(
    cookieHeader.split('; ').map(c => c.split('='))
  );
  const sessionCookie = cookies.session;

  if (!sessionCookie) {
    return new Response(
      JSON.stringify({ error: 'Not authenticated' }),
      {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }

  try {
    const secret = new TextEncoder().encode(process.env.SESSION_SECRET);
    const { payload } = await jwtVerify(sessionCookie, secret);

    const token = payload.github_token as string;
    const mode = payload.mode as string;

    // Verificar scopes no GitHub
    const userRes = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    });

    const scopesHeader = userRes.headers.get('x-oauth-scopes');

    return new Response(
      JSON.stringify({
        mode: mode,
        scopes_from_header: scopesHeader,
        scopes_array: scopesHeader ? scopesHeader.split(', ') : [],
        user_status: userRes.status,
        user_ok: userRes.ok,
      }, null, 2),
      {
        headers: {
          'Content-Type': 'application/json',
        }
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: 'Invalid session',
        details: error instanceof Error ? error.message : String(error)
      }),
      {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}
