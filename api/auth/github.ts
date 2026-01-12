import { SignJWT } from 'jose';

export const config = { runtime: 'edge' };

export default async function handler(req: Request) {
  const clientId = process.env.GITHUB_CLIENT_ID;
  const callbackUrl = process.env.GITHUB_CALLBACK_URL;
  const sessionSecret = process.env.SESSION_SECRET;

  if (!clientId || !callbackUrl || !sessionSecret) {
    return new Response('Missing environment variables', { status: 500 });
  }

  const requestUrl = new URL(req.url);
  const mode = requestUrl.searchParams.get('mode') || 'read';

  // 🛡️ SENTINEL: Generate a random state for CSRF protection.
  // The state is passed to GitHub and then returned in the callback.
  // We can then verify it to prevent Cross-Site Request Forgery attacks.
  // Using a cryptographically secure random number generator is crucial here.
  const randomBytes = new Uint8Array(32);
  crypto.getRandomValues(randomBytes);
  const state = Array.from(randomBytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  const scopes = mode === 'write'
    ? 'read:user read:org repo' // Write: full access
    : 'read:user read:org';      // Read: read-only

  const url = new URL('https://github.com/login/oauth/authorize');
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', callbackUrl);
  url.searchParams.set('scope', scopes);
  url.searchParams.set('state', state); // Use state for CSRF protection

  // 🛡️ SENTINEL: Secure the state and mode in a signed JWT.
  // This prevents tampering with the permissions (mode) during the OAuth flow.
  const secret = new TextEncoder().encode(sessionSecret);
  const stateToken = await new SignJWT({ state, mode })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('5m') // Short-lived token
    .sign(secret);


  // Store the state and mode in a secure, HttpOnly cookie to verify on callback.
  const isSecure = requestUrl.protocol === 'https:';

  const cookie = `oauth_state=${stateToken}; HttpOnly; ${
    isSecure ? 'Secure;' : ''
  } Path=/; SameSite=Lax; Max-Age=300`; // 5 minutes expiry

  // Redirect to GitHub, including the CSRF state and the new cookie.
  return new Response(null, {
    status: 302,
    headers: {
      'Location': url.toString(),
      'Set-Cookie': cookie,
    },
  });
}
