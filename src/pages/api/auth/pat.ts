import { SignJWT } from 'jose';

interface PATAuthRequestBody {
  token?: string;
}

export async function POST({ request }: { request: Request }) {
  const secretValue = import.meta.env.SESSION_SECRET;
  if (!secretValue) {
    return new Response(
      'Missing required environment variable SESSION_SECRET. ' +
      'Copy .env.example → .env.local and generate one with `openssl rand -hex 32`.',
      { status: 500 }
    );
  }

  let body: PATAuthRequestBody;
  try {
    body = (await request.json()) as PATAuthRequestBody;
  } catch {
    return new Response('Invalid JSON body', { status: 400 });
  }

  const token = body.token?.trim();
  const mode: 'write' = 'write';

  if (!token) {
    return new Response('Token is required', { status: 400 });
  }

  const secret = new TextEncoder().encode(secretValue);
  const session = await new SignJWT({
    github_token: token,
    mode,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secret);

  const requestUrl = new URL(request.url);
  const forwardedProto = request.headers.get('x-forwarded-proto');
  const isHttps = requestUrl.protocol === 'https:' || forwardedProto === 'https';

  const response = new Response(JSON.stringify({ success: true }), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  });

  response.headers.set(
    'Set-Cookie',
    `session=${session}; HttpOnly; ${isHttps ? 'Secure; ' : ''}SameSite=Strict; Max-Age=${
      60 * 60 * 24 * 7
    }; Path=/`,
  );

  return response;
}
