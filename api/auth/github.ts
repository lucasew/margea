export const config = { runtime: 'edge' };

export default function handler(req: Request) {
  const clientId = process.env.GITHUB_CLIENT_ID;
  const callbackUrl = process.env.GITHUB_CALLBACK_URL;

  if (!clientId || !callbackUrl) {
    return new Response('Missing environment variables', { status: 500 });
  }

  const url = new URL('https://github.com/login/oauth/authorize');
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', callbackUrl);
  url.searchParams.set('scope', 'read:user read:org repo');

  return Response.redirect(url.toString(), 302);
}
