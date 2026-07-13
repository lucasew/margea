import { isSecureRequest } from '../../../utils/requestUtils';
import { clearSessionCookie } from './cookies';
import { createSuccessResponse } from './utils';

export async function POST({ request }: { request: Request }) {
  const isHttps = isSecureRequest(request);

  const response = createSuccessResponse();

  // Clear session cookie
  response.headers.set('Set-Cookie', clearSessionCookie(isHttps));

  return response;
}
