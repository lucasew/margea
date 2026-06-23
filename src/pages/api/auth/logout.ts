export async function POST({ request }: { request: Request }) {
  const requestUrl = new URL(request.url);
  const forwardedProto = request.headers.get('x-forwarded-proto');
  const isHttps =
    requestUrl.protocol === 'https:' || forwardedProto === 'https';

  const response = new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' },
  });

  // Limpar cookie
  response.headers.set(
    'Set-Cookie',
    `session=; HttpOnly; ${isHttps ? 'Secure; ' : ''}SameSite=Strict; Max-Age=0; Path=/`,
  );

  return response;
}
