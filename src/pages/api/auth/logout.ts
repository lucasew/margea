import { isSecureRequest } from '../../../utils/requestUtils';
import { clearSessionCookie } from './cookies';

export async function POST({ request }: { request: Request }) {
  const isHttps = isSecureRequest(request);

  const response = new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' },
  });

  // Clear session cookie
  response.headers.set('Set-Cookie', clearSessionCookie(isHttps));

  return response;
}
