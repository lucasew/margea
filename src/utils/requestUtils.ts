export function isSecureRequest(request: Request): boolean {
  const requestUrl = new URL(request.url);
  const forwardedProto = request.headers.get('x-forwarded-proto');
  return requestUrl.protocol === 'https:' || forwardedProto === 'https';
}
