import { SignJWT } from 'jose';

export const config = { runtime: 'edge' };

interface PATAuthRequestBody {
  token?: string;
}

export default async function handler(req: Request) {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const secretValue = process.env.SESSION_SECRET;
  if (!secretValue) {
    return new Response('Missing environment variables', { status: 500 });
  }

  let body: PATAuthRequestBody;
  try {
    body = (await req.json()) as PATAuthRequestBody;
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

  const response = new Response(JSON.stringify({ success: true }), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  });

  response.headers.set(
    'Set-Cookie',
    `session=${session}; HttpOnly; Secure; SameSite=Strict; Max-Age=${
      60 * 60 * 24 * 7
    }; Path=/`,
  );

  return response;
}
