import { jwtDecrypt } from 'jose';
import { parse } from 'cookie';

export const config = { runtime: 'edge' };

/**
 * Handles the session data retrieval request.
 *
 * This endpoint serves as a secure bridge for the client to access session information.
 * Since the session cookie is `HttpOnly`, the client-side JavaScript cannot read it directly.
 *
 * Responsibilities:
 * 1. **Authentication**: Checks for the presence of the `session` cookie.
 * 2. **Decryption**: Verifies and decrypts the JWE session token using the server-side secret.
 * 3. **Exposure**: Returns the decrypted access token and user permissions (mode) to the client
 *    in a JSON response.
 *
 * Security:
 * - This endpoint allows the React application to get the GitHub token for making API requests
 *   while keeping the session management secure.
 * - Responses are set with `Cache-Control: no-store` to prevent caching of sensitive data.
 *
 * @param req - The incoming HTTP request.
 * @returns A JSON response containing `token` and `mode` if authenticated, or an error.
 */
export default async function handler(req: Request) {
  // Parse cookies from header
  const cookieHeader = req.headers.get('cookie') || '';
  const cookies = parse(cookieHeader);
  const sessionCookie = cookies.session;

  if (!sessionCookie) {
    return new Response(JSON.stringify({ error: 'Not authenticated' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const rawSecret = new TextEncoder().encode(process.env.SESSION_SECRET);
    const encryptionKey = await crypto.subtle.digest('SHA-256', rawSecret);
    const { payload } = await jwtDecrypt(
      sessionCookie,
      new Uint8Array(encryptionKey),
    );

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
