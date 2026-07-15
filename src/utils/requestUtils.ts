/**
 * Whether the request should be treated as HTTPS for Secure cookie flags.
 * Direct `https:` wins; otherwise use the left-most `x-forwarded-proto` hop
 * (proxies may send a comma-separated chain such as `https,http`).
 */
export function isSecureRequest(request: Request): boolean {
  const requestUrl = new URL(request.url);
  if (requestUrl.protocol === 'https:') {
    return true;
  }

  const forwardedProto = request.headers.get('x-forwarded-proto');
  if (!forwardedProto) {
    return false;
  }

  const firstHop = forwardedProto.split(',')[0]?.trim().toLowerCase();
  return firstHop === 'https';
}
