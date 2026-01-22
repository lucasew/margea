import { jwtVerify } from 'jose';
import { parse } from 'cookie';

export const config = { runtime: 'edge' };

export default async function handler(req: Request) {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  // Parse cookies from header
  const cookieHeader = req.headers.get('cookie') || '';
  const cookies = parse(cookieHeader);
  const sessionCookie = cookies.session;

  if (!sessionCookie) {
    return new Response(
      JSON.stringify({ error: 'Not authenticated' }),
      {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }

  let token: string;

  try {
    const secret = new TextEncoder().encode(process.env.SESSION_SECRET);
    const { payload } = await jwtVerify(sessionCookie, secret);
    token = payload.github_token as string;
  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Invalid session' }),
      {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }

  try {
    const body = await req.json();
    const response = await fetch('https://api.github.com/graphql', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Forward rate limit headers
    const remaining = response.headers.get('X-RateLimit-Remaining');
    if (remaining) headers['X-RateLimit-Remaining'] = remaining;

    const reset = response.headers.get('X-RateLimit-Reset');
    if (reset) headers['X-RateLimit-Reset'] = reset;

    return new Response(JSON.stringify(data), {
      status: response.status,
      headers,
    });

  } catch (error) {
    console.error('Error proxying to GitHub:', error);
    return new Response(
      JSON.stringify({ error: 'Error connecting to GitHub' }),
      {
        status: 502,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}
