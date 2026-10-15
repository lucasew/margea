import { reportError } from '../../../utils/errorReporting';
import { isSecureRequest } from '../../../utils/requestUtils';
import { buildOAuthStateCookie, signOAuthStateJwt } from './cookies';

export async function GET({ request }: { request: Request }) {
  const clientId = import.meta.env.GITHUB_CLIENT_ID;
  const callbackUrl = import.meta.env.GITHUB_CALLBACK_URL;
  const sessionSecret = import.meta.env.SESSION_SECRET;
  const requestUrl = new URL(request.url);

  if (!clientId || !callbackUrl || !sessionSecret) {
    reportError(new Error('Missing required environment variables'), {
      context: 'github auth endpoint',
      missingClientId: !clientId,
      missingCallbackUrl: !callbackUrl,
      missingSessionSecret: !sessionSecret,
    });
    return new Response(
      'Missing required environment variables (GITHUB_CLIENT_ID, GITHUB_CALLBACK_URL, SESSION_SECRET). ' +
        'Copy .env.example → .env.local and fill them. See README for GitHub OAuth setup.',
      { status: 500 },
    );
  }

  // Only 'read' | 'write' are valid OAuth modes. Missing → 'read'.
  // Present-but-invalid → 400 so arbitrary values never enter the state JWT.
  const modeParam = requestUrl.searchParams.get('mode');
  if (modeParam !== null && modeParam !== 'read' && modeParam !== 'write') {
    return new Response("Invalid mode: must be 'read' or 'write'.", {
      status: 400,
    });
  }
  const mode: 'read' | 'write' = modeParam === 'write' ? 'write' : 'read';

  const randomBytes = new Uint8Array(32);
  crypto.getRandomValues(randomBytes);
  const nonce = Array.from(randomBytes, (b) =>
    b.toString(16).padStart(2, '0'),
  ).join('');

  const scopes =
    mode === 'write' ? 'read:user read:org repo' : 'read:user read:org';

  const url = new URL('https://github.com/login/oauth/authorize');
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', callbackUrl);
  url.searchParams.set('scope', scopes);
  url.searchParams.set('prompt', 'consent');
  // Put a signed JWT directly in `state`, so callback validation does not
  // depend on browser cookies surviving the provider redirect.
  const secret = new TextEncoder().encode(sessionSecret);
  const stateToken = await signOAuthStateJwt({ nonce, mode }, secret);
  url.searchParams.set('state', stateToken);

  const isHttps = isSecureRequest(request);
  const cookie = buildOAuthStateCookie(stateToken, isHttps);

  return new Response(null, {
    status: 302,
    headers: {
      Location: url.toString(),
      'Set-Cookie': cookie,
    },
  });
}
