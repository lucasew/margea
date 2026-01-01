// api/lib/cookies.ts

/**
 * Parses cookies from the request headers and returns the value of a specific cookie.
 *
 * @param req The incoming Request object.
 * @param name The name of the cookie to retrieve.
 * @returns The cookie value or undefined if not found.
 */
export function getCookie(req: Request, name: string): string | undefined {
  const cookieHeader = req.headers.get('Cookie');
  if (!cookieHeader) return undefined;

  const cookies = cookieHeader.split(';');
  for (const cookie of cookies) {
    const [cookieName, ...cookieValue] = cookie.trim().split('=');
    if (cookieName === name) {
      return cookieValue.join('=');
    }
  }

  return undefined;
}
