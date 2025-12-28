import { SignJWT } from 'jose';

export const config = { runtime: 'edge' };

// Helper to parse cookies from the request headers
function getCookie(req: Request, name: string): string | undefined {
  const cookieHeader = req.headers.get('Cookie');
  if (!cookieHeader) return undefined;
  const cookies = cookieHeader.split(';');
  for (const cookie of cookies) {
    const [cookieName, ...cookieValue] = cookie.trim().split('=');
    if (cookieName === name) {
      return cookieValue.join('=');
    }
  }
  return undefined;
}

export default async function handler(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const stateFromParam = searchParams.get('state');

  // 🛡️ SENTINEL: Verify the CSRF token (state) to prevent attacks.
  const oauthStateCookie = getCookie(req, 'oauth_state');

  if (!code || !stateFromParam || !oauthStateCookie) {
    return new Response('Invalid request: missing parameters.', { status: 400 });
  }

  // Decode the cookie and compare the state values
  const oauthState = JSON.parse(atob(oauthStateCookie));
  const { state: stateFromCookie, mode } = oauthState;

  if (stateFromParam !== stateFromCookie) {
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
  const secret = new TextEncoder().encode(process.env.SESSION_SECRET);
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
