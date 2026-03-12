import { SignJWT } from 'jose';

export const config = { runtime: 'edge' };

/**
 * Initiates the GitHub OAuth 2.0 authorization flow.
 *
 * This handler is the entry point for user authentication. Its primary responsibilities are:
 * 1. **State Generation**: Creates a cryptographically secure random 'state' parameter to prevent
 *    Cross-Site Request Forgery (CSRF) attacks.
 * 2. **State Signing**: Signs the state (and requested mode) into a JWT and stores it in a secure,
 *    HttpOnly cookie. This allows the callback handler to verify that the request originated
 *    from this application and was not tampered with.
 * 3. **Redirection**: Redirects the user to GitHub's authorization page with the correct scope
 *    and parameters.
 *
 * @param req - The incoming HTTP request.
 * @returns A 302 Redirect response to GitHub's OAuth endpoint.
 */
export default async function handler(req: Request) {
  const clientId = process.env.GITHUB_CLIENT_ID;
  const sessionSecret = process.env.SESSION_SECRET;
  const requestUrl = new URL(req.url);
  const dynamicCallbackUrl = `${requestUrl.origin}/api/auth/callback`;
  const callbackUrl =
    process.env.VERCEL_ENV === 'production' && process.env.GITHUB_CALLBACK_URL
      ? process.env.GITHUB_CALLBACK_URL
      : dynamicCallbackUrl;

  if (!clientId || !sessionSecret) {
    return new Response('Missing environment variables', { status: 500 });
  }

  const mode = requestUrl.searchParams.get('mode') || 'read';

  // 🛡️ SENTINEL: Generate a random nonce to embed in signed state.
  const randomBytes = new Uint8Array(32);
  crypto.getRandomValues(randomBytes);
  const nonce = Array.from(randomBytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  const scopes =
    mode === 'write'
      ? 'read:user read:org repo' // Write: full access
      : 'read:user read:org'; // Read: read-only

  const url = new URL('https://github.com/login/oauth/authorize');
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', callbackUrl);
  url.searchParams.set('scope', scopes);
  // Put a signed JWT directly in `state`, so callback validation does not
  // depend on browser cookies surviving the provider redirect.
  const secret = new TextEncoder().encode(sessionSecret);
  const stateToken = await new SignJWT({ nonce, mode })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('5m')
    .sign(secret);
  url.searchParams.set('state', stateToken);

  // Keep cookie as an optional second validation channel (double-submit style).
  const isSecure = requestUrl.protocol === 'https:';

  const cookie = `oauth_state=${stateToken}; HttpOnly; ${
    isSecure ? 'Secure;' : ''
  } Path=/; SameSite=Lax; Max-Age=300`; // 5 minutes expiry

  // Redirect to GitHub, including the CSRF state and the new cookie.
  return new Response(null, {
    status: 302,
    headers: {
      Location: url.toString(),
      'Set-Cookie': cookie,
    },
  });
}
