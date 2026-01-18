import { jwtDecrypt } from 'jose';
import { parse } from 'cookie';

export const config = { runtime: 'edge' };

export default async function handler(req: Request) {
  // Parse cookies from header
  const cookieHeader = req.headers.get('cookie') || '';
  const cookies = parse(cookieHeader);
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
    // 🛡️ SENTINEL: Use the same SHA-256 derived key to decrypt the session.
    const secretKey = await crypto.subtle.digest('SHA-256', secret);
    const { payload } = await jwtDecrypt(sessionCookie, new Uint8Array(secretKey));

    return new Response(
      JSON.stringify({
        token: payload.github_token,
        mode: payload.mode || 'read' // Default: read-only
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store, no-cache, must-revalidate'
        }
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Invalid session' }),
      {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}
