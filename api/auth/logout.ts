export const config = { runtime: 'edge' };

export default function handler(req: Request) {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const response = new Response(
    JSON.stringify({ success: true }),
    { headers: { 'Content-Type': 'application/json' } }
  );

  // Limpar cookie
  response.headers.set('Set-Cookie',
    'session=; HttpOnly; Secure; SameSite=Strict; Max-Age=0; Path=/'
  );

  return response;
}
