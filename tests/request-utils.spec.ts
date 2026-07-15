import { test, expect } from '@playwright/test';
import { isSecureRequest } from '../src/utils/requestUtils';

function req(url: string, headers: Record<string, string> = {}): Request {
  return new Request(url, { headers });
}

test.describe('isSecureRequest', () => {
  test('true for https URL', () => {
    expect(isSecureRequest(req('https://example.com/api'))).toBe(true);
  });

  test('true when x-forwarded-proto is https (proxy)', () => {
    expect(
      isSecureRequest(
        req('http://example.com/api', { 'x-forwarded-proto': 'https' }),
      ),
    ).toBe(true);
  });

  test('false for plain http without secure forward header', () => {
    expect(isSecureRequest(req('http://example.com/api'))).toBe(false);
    expect(
      isSecureRequest(
        req('http://example.com/api', { 'x-forwarded-proto': 'http' }),
      ),
    ).toBe(false);
  });

  test('https URL wins even if forward header is http', () => {
    expect(
      isSecureRequest(
        req('https://example.com/api', { 'x-forwarded-proto': 'http' }),
      ),
    ).toBe(true);
  });
});
