import { SignJWT, jwtVerify } from 'jose';
import { parse } from 'cookie';

export async function GET({ request }: { request: Request }) {
  const requestUrl = new URL(request.url);
  const callbackUrl = import.meta.env.GITHUB_CALLBACK_URL;
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const stateTokenFromParam = searchParams.get('state');

  if (!callbackUrl) {
    return new Response(
      'Missing required environment variable GITHUB_CALLBACK_URL. ' +
      'Copy .env.example → .env.local and fill it (must match the callback URL registered in your GitHub OAuth App).',
      { status: 500 }
    );
  }

  // Optional cookie channel (can be absent in preview host changes).
  const cookieHeader = request.headers.get('Cookie') || '';
  const cookies = parse(cookieHeader);
  const oauthStateCookie = cookies.oauth_state;

  if (!code || !stateTokenFromParam) {
    return new Response('Invalid request: missing parameters.', {
      status: 400,
    });
  }

  // 🛡️ SENTINEL: Verify signed state token from callback parameter.
  // This keeps CSRF protection even when preview host differences drop cookies.
  const secret = new TextEncoder().encode(import.meta.env.SESSION_SECRET);
  let nonceFromParamToken: string;
  let mode: string;

  try {
    const { payload } = await jwtVerify(stateTokenFromParam, secret);
    if (typeof payload.nonce !== 'string' || typeof payload.mode !== 'string') {
      throw new Error('Invalid JWT payload');
    }
    nonceFromParamToken = payload.nonce;
    mode = payload.mode;
  } catch {
    return new Response('Invalid or expired OAuth state.', {
      status: 403,
    });
  }

  // Optional strict check when cookie is present.
  if (oauthStateCookie) {
    try {
      const { payload } = await jwtVerify(oauthStateCookie, secret);
      if (typeof payload.nonce !== 'string' || payload.nonce !== nonceFromParamToken) {
        return new Response('Invalid CSRF token (state mismatch).', {
          status: 403,
        });
      }
    } catch {
      return new Response('Invalid OAuth state cookie.', {
        status: 403,
      });
    }
  }

  // Exchange the authorization code for an access token
  const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: import.meta.env.GITHUB_CLIENT_ID,
      client_secret: import.meta.env.GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: callbackUrl,
    }),
  });

  const data = await tokenRes.json();
  const access_token = data.access_token;

  if (!access_token) {
    return new Response(
      `Failed to get token: ${data.error_description || data.error || 'Unknown error'}`,
      { status: 500 },
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

  const baseUrl = requestUrl.origin;

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
