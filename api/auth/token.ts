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
    // 🛡️ SENTINEL: Derive the same 32-byte key used for encryption
    const secretKey = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(process.env.SESSION_SECRET));
    const encryptionKey = new Uint8Array(secretKey);

    const { payload } = await jwtDecrypt(sessionCookie, encryptionKey);

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
