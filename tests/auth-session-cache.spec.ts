import { test, expect } from '@playwright/test';
import { AuthService, invalidateAuthSessionCache } from '../src/services/auth';
import { API_ROUTES } from '../src/constants';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

test.describe('AuthService session token cache', () => {
  let originalFetch: typeof fetch;
  let tokenCalls: number;
  let fetchImpl: (
    input: RequestInfo | URL,
    init?: RequestInit,
  ) => Promise<Response>;

  test.beforeEach(() => {
    invalidateAuthSessionCache();
    tokenCalls = 0;
    originalFetch = globalThis.fetch;
    fetchImpl = async (input) => {
      const url = String(input);
      if (
        url.includes(API_ROUTES.AUTH_TOKEN) ||
        url.endsWith(API_ROUTES.AUTH_TOKEN)
      ) {
        tokenCalls += 1;
        return jsonResponse({ token: 'gh_tok', mode: 'write' });
      }
      throw new Error(`unexpected fetch: ${url}`);
    };
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

    fetchImpl = async (input) => {
      const url = String(input);
      if (
        url.includes(API_ROUTES.AUTH_TOKEN) ||
        url.endsWith(API_ROUTES.AUTH_TOKEN)
      ) {
        tokenCalls += 1;
        await gate;
        return jsonResponse({ token: 'shared', mode: 'read' });
      }
      throw new Error(`unexpected fetch: ${url}`);
    };

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

    fetchImpl = async (input) => {
      const url = String(input);
      if (
        url.includes(API_ROUTES.AUTH_TOKEN) ||
        url.endsWith(API_ROUTES.AUTH_TOKEN)
      ) {
        tokenCalls += 1;
        return jsonResponse({ token: 'new_tok', mode: 'read' });
      }
      throw new Error(`unexpected fetch: ${url}`);
    };

    expect(await AuthService.getToken()).toBe('new_tok');
    expect(tokenCalls).toBe(2);
  });

  test('unauthenticated result is cached (no repeat 401 storms)', async () => {
    fetchImpl = async (input) => {
      const url = String(input);
      if (
        url.includes(API_ROUTES.AUTH_TOKEN) ||
        url.endsWith(API_ROUTES.AUTH_TOKEN)
      ) {
        tokenCalls += 1;
        return jsonResponse({ error: 'Not authenticated' }, 401);
      }
      throw new Error(`unexpected fetch: ${url}`);
    };

    expect(await AuthService.getToken()).toBeNull();
    expect(await AuthService.getToken()).toBeNull();
    expect(await AuthService.isAuthenticated()).toBe(false);
    expect(tokenCalls).toBe(1);
  });

  test('network error does not cache null', async () => {
    let fail = true;
    fetchImpl = async (input) => {
      const url = String(input);
      if (
        url.includes(API_ROUTES.AUTH_TOKEN) ||
        url.endsWith(API_ROUTES.AUTH_TOKEN)
      ) {
        tokenCalls += 1;
        if (fail) throw new TypeError('Failed to fetch');
        return jsonResponse({ token: 'recovered', mode: 'read' });
      }
      throw new Error(`unexpected fetch: ${url}`);
    };

    expect(await AuthService.getToken()).toBeNull();
    expect(tokenCalls).toBe(1);

    fail = false;
    expect(await AuthService.getToken()).toBe('recovered');
    expect(tokenCalls).toBe(2);
  });
});
