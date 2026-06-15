import { SignJWT } from 'jose';

export async function GET({ request }: { request: Request }) {
  const clientId = import.meta.env.GITHUB_CLIENT_ID;
  const callbackUrl = import.meta.env.GITHUB_CALLBACK_URL;
  const sessionSecret = import.meta.env.SESSION_SECRET;
  const requestUrl = new URL(request.url);

  if (!clientId || !callbackUrl || !sessionSecret) {
    return new Response(
      'Missing required environment variables (GITHUB_CLIENT_ID, GITHUB_CALLBACK_URL, SESSION_SECRET). ' +
      'Copy .env.example → .env.local and fill them. See README for GitHub OAuth setup.',
      { status: 500 }
    );
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
