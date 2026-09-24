import { test, expect } from '@playwright/test';
import { AuthService, invalidateAuthSessionCache } from '../src/services/auth';
import { API_ROUTES } from '../src/constants';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function isSessionTokenRequest(input: RequestInfo | URL): boolean {
  const url = String(input);
  return (
    url.includes(API_ROUTES.AUTH_TOKEN) || url.endsWith(API_ROUTES.AUTH_TOKEN)
  );
}

test.describe('AuthService session token cache', () => {
  let originalFetch: typeof fetch;
  let tokenCalls: number;
  let fetchImpl: (
    input: RequestInfo | URL,
    init?: RequestInit,
  ) => Promise<Response>;

  function sessionTokenFetch(
    respond: () => Response | Promise<Response>,
  ): typeof fetchImpl {
    return async (input) => {
      if (!isSessionTokenRequest(input)) {
        throw new Error(`unexpected fetch: ${String(input)}`);
      }
      tokenCalls += 1;
      return respond();
    };
  }

  test.beforeEach(() => {
    invalidateAuthSessionCache();
    tokenCalls = 0;
    originalFetch = globalThis.fetch;
    fetchImpl = sessionTokenFetch(() =>
      jsonResponse({ token: 'gh_tok', mode: 'write' }),
    );
    globalThis.fetch = ((input: RequestInfo | URL, init?: RequestInit) =>
      fetchImpl(input, init)) as typeof fetch;
  });

  test.afterEach(() => {
    globalThis.fetch = originalFetch;
    invalidateAuthSessionCache();
  });

  test('getToken reuses one /api/auth/token response across calls', async () => {
    const a = await AuthService.getToken();
    const b = await AuthService.getToken();
    const c = await AuthService.getAuthData();

    expect(a).toBe('gh_tok');
    expect(b).toBe('gh_tok');
    expect(c?.token).toBe('gh_tok');
    expect(c?.loginMode).toBe('write');
    expect(tokenCalls).toBe(1);
  });

  test('parallel getToken/getAuthData single-flight one network call', async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });

    fetchImpl = sessionTokenFetch(async () => {
      await gate;
      return jsonResponse({ token: 'shared', mode: 'read' });
    });

    const pending = Promise.all([
      AuthService.getToken(),
      AuthService.getToken(),
      AuthService.getAuthData(),
    ]);

    // Let microtasks attach to in-flight before releasing
    await new Promise((r) => setTimeout(r, 10));
    expect(tokenCalls).toBe(1);

    release();
    const [t1, t2, data] = await pending;
    expect(t1).toBe('shared');
    expect(t2).toBe('shared');
    expect(data?.token).toBe('shared');
    expect(tokenCalls).toBe(1);
  });

  test('invalidateAuthSessionCache forces a new session fetch', async () => {
    expect(await AuthService.getToken()).toBe('gh_tok');
    expect(tokenCalls).toBe(1);

    invalidateAuthSessionCache();

    fetchImpl = sessionTokenFetch(() =>
      jsonResponse({ token: 'new_tok', mode: 'read' }),
    );

    expect(await AuthService.getToken()).toBe('new_tok');
    expect(tokenCalls).toBe(2);
  });

  test('unauthenticated result is cached (no repeat 401 storms)', async () => {
    fetchImpl = sessionTokenFetch(() =>
      jsonResponse({ error: 'Not authenticated' }, 401),
    );

    expect(await AuthService.getToken()).toBeNull();
    expect(await AuthService.getToken()).toBeNull();
    expect(await AuthService.isAuthenticated()).toBe(false);
    expect(tokenCalls).toBe(1);
  });

  test('network error does not cache null', async () => {
    let fail = true;
    fetchImpl = sessionTokenFetch(() => {
      if (fail) throw new TypeError('Failed to fetch');
      return jsonResponse({ token: 'recovered', mode: 'read' });
    });

    expect(await AuthService.getToken()).toBeNull();
    expect(tokenCalls).toBe(1);

    fail = false;
    expect(await AuthService.getToken()).toBe('recovered');
    expect(tokenCalls).toBe(2);
  });
});
