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
      { status: 500 },
    );
  }

  let body: PATAuthRequestBody;
  try {
    body = (await request.json()) as PATAuthRequestBody;
  } catch {
    return new Response('Invalid JSON body', { status: 400 });
  }

  let token = (body.token || '').trim();

  // Defensively strip common "smart quotes" / curly quotes that users
  // frequently paste by accident from documentation, Notion, email, Word, etc.
  // These are the main cause of the "ByteString" / character > 255 fetch errors later.
  token = token.replace(/["“”‘’„‟]/g, '');

  // Session still stores a login label for compatibility; capability is probed
  // client-side from the token's X-OAuth-Scopes (not this field).
  const mode = 'read' as const;

  if (!token) {
    return new Response('Token is required', { status: 400 });
  }

  // Basic validation: GitHub tokens are alphanumeric + a few symbols.
  // Rejecting here gives a much clearer error at PAT entry time instead of
  // a cryptic "Window.fetch: Cannot convert value... ByteString" later.
  if (!/^[A-Za-z0-9_.-]+$/.test(token)) {
    return new Response(
      'The PAT you provided contains invalid characters (for example curly quotes “ ”). ' +
        'Please go back to GitHub → Personal access tokens, copy the token directly (plain text), and paste it again.',
      { status: 400 },
    );
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
  const isHttps =
    requestUrl.protocol === 'https:' || forwardedProto === 'https';

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
