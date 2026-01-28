import { SignJWT, jwtVerify } from 'jose';
import { parse } from 'cookie';

export const config = { runtime: 'edge' };

/**
 * Handles the GitHub OAuth 2.0 callback.
 *
 * This function completes the authentication flow by:
 * 1. **Validation**: Verifying the presence of the authorization `code` and `state`.
 * 2. **CSRF Protection**: Verifying the `oauth_state` signed cookie and comparing its state with the one
 *    returned by GitHub. This ensures the response corresponds to a request we initiated.
 * 3. **Token Exchange**: Exchanging the authorization code for a GitHub access token.
 * 4. **Session Creation**: Creating a long-lived, signed JWS session cookie containing the
 *    GitHub access token and the user's selected mode.
 * 5. **Cleanup**: Clearing the temporary `oauth_state` cookie.
 *
 * @param req - The incoming HTTP request.
 * @returns A 302 Redirect response to the application root with the new session.
 */
export default async function handler(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const stateFromParam = searchParams.get('state');

  // 🛡️ SENTINEL: Verify the CSRF token (state) to prevent attacks.
  const cookieHeader = req.headers.get('Cookie') || '';
  const cookies = parse(cookieHeader);
  const oauthStateCookie = cookies.oauth_state;

  if (!code || !stateFromParam || !oauthStateCookie) {
    return new Response('Invalid request: missing parameters.', { status: 400 });
  }

  // 🛡️ SENTINEL: Verify the signed JWT from the cookie.
  // This prevents tampering with the state and permissions (mode).
  const secret = new TextEncoder().encode(process.env.SESSION_SECRET);
  let stateFromToken: string;
  let mode: string;

  try {
    const { payload } = await jwtVerify(oauthStateCookie, secret);
    if (typeof payload.state !== 'string' || typeof payload.mode !== 'string') {
      throw new Error('Invalid JWT payload');
    }
    stateFromToken = payload.state;
    mode = payload.mode;
  } catch {
    return new Response('Invalid or expired OAuth state token.', { status: 403 });
  }

  // Compare the state from the parameter with the one from the signed JWT
  if (stateFromParam !== stateFromToken) {
    return new Response('Invalid CSRF token (state mismatch).', { status: 403 });
  }

  // Exchange the authorization code for an access token
  const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: process.env.GITHUB_CLIENT_ID,
      client_secret: process.env.GITHUB_CLIENT_SECRET,
      code,
    }),
  });

  const data = await tokenRes.json();
  const access_token = data.access_token;

  if (!access_token) {
    return new Response(
      `Failed to get token: ${data.error_description || data.error || 'Unknown error'}`,
      { status: 500 }
    );
  }

  // Create a secure session JWT
  const session = await new SignJWT({
    github_token: access_token,
    mode: mode,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secret);

  const baseUrl = new URL(req.url).origin;

  // Set the session cookie and clear the state cookie
  const sessionCookie = `session=${session}; HttpOnly; Secure; SameSite=Strict; Max-Age=${
    60 * 60 * 24 * 7
  }; Path=/`;
  const clearStateCookie = `oauth_state=; HttpOnly; Path=/; Max-Age=0`;

  // 🛡️ SENTINEL: To set multiple cookies, we must use multiple `Set-Cookie` headers.
  // Using a single header with a comma-separated list is not compliant with RFC 6265.
  const headers = new Headers();
  headers.append('Location', baseUrl);
  headers.append('Set-Cookie', sessionCookie);
  headers.append('Set-Cookie', clearStateCookie);

  return new Response(null, {
    status: 302,
    headers: headers,
  });
}
