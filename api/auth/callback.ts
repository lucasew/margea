import { SignJWT } from 'jose';

export const config = { runtime: 'edge' };

export default async function handler(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');

  if (!code) {
    return new Response('Missing code parameter', { status: 400 });
  }

  // Trocar code por access_token
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

  // Criar JWT com token
  const secret = new TextEncoder().encode(process.env.SESSION_SECRET);
  const session = await new SignJWT({ github_token: access_token })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secret);

  // Redirecionar com cookie
  const baseUrl = new URL(req.url).origin;
  const response = Response.redirect(baseUrl, 302);

  response.headers.set('Set-Cookie',
    `session=${session}; ` +
    `HttpOnly; ` +
    `Secure; ` +
    `SameSite=Strict; ` +
    `Max-Age=${60 * 60 * 24 * 7}; ` +
    `Path=/`
  );

  return response;
}
