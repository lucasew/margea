import { reportError } from '../../../utils/errorReporting';

export function getSessionSecretOrResponse(context: string): {
  secret?: string;
  response?: Response;
} {
  const secretValue = import.meta.env.SESSION_SECRET;
  if (!secretValue) {
    reportError(
      new Error('Missing required environment variable SESSION_SECRET'),
      {
        context,
      },
    );
    return {
      response: new Response(
        'Missing required environment variable SESSION_SECRET. ' +
          'Copy .env.example → .env.local and generate one with `openssl rand -hex 32`.',
        { status: 500 },
      ),
    };
  }
  return { secret: secretValue };
}

/** Shared success body for auth POSTs (logout, PAT). Always no-store. */
export function createSuccessResponse(
  headers?: Record<string, string>,
): Response {
  return new Response(JSON.stringify({ success: true }), {
    headers: {
      'Content-Type': 'application/json',
      // Auth success responses must not be cached (session cookies, etc.).
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      ...headers,
    },
  });
}
