import { isSecureRequest } from '../../../utils/requestUtils';

export async function POST({ request }: { request: Request }) {
  const isHttps = isSecureRequest(request);

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
