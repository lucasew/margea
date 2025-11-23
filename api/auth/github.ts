export const config = { runtime: 'edge' };

export default function handler(req: Request) {
  const clientId = process.env.GITHUB_CLIENT_ID;
  const callbackUrl = process.env.GITHUB_CALLBACK_URL;

  if (!clientId || !callbackUrl) {
    return new Response('Missing environment variables', { status: 500 });
  }

  // Extrair modo do query param (default: read)
  const requestUrl = new URL(req.url);
  const mode = requestUrl.searchParams.get('mode') || 'read';

  // Definir scopes baseado no modo
  const scopes = mode === 'write'
    ? 'read:user read:org repo' // Write: full access
    : 'read:user read:org';      // Read: read-only

  const url = new URL('https://github.com/login/oauth/authorize');
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', callbackUrl);
  url.searchParams.set('scope', scopes);
  url.searchParams.set('state', mode); // Passar mode via state
  url.searchParams.set('allow_signup', 'true');

  return Response.redirect(url.toString(), 302);
}
