export const config = { runtime: 'edge' };

/**
 * Handles the user logout request.
 *
 * This endpoint is responsible for securely terminating the user's session on the server side.
 *
 * Mechanism:
 * - It overwrites the existing `session` cookie with an empty value and an immediate expiration (`Max-Age=0`).
 * - This effectively removes the cookie from the user's browser, preventing further authenticated requests.
 *
 * @param req - The incoming HTTP request.
 * @returns A JSON response indicating success and a `Set-Cookie` header to clear the session.
 */
export default function handler(req: Request) {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const response = new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' },
  });

  // Limpar cookie
  response.headers.set(
    'Set-Cookie',
    'session=; HttpOnly; Secure; SameSite=Strict; Max-Age=0; Path=/',
  );

  return response;
}
