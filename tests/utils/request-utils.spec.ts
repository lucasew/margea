import { expect, test } from '@playwright/test';
import { isSecureRequest } from '../../src/utils/requestUtils';

function req(url: string, headers: Record<string, string> = {}): Request {
  return new Request(url, { headers });
}

test.describe('isSecureRequest', () => {
  test('returns true for direct https protocol', () => {
    expect(isSecureRequest(req('https://example.com/api'))).toBe(true);
  });

  test('returns false for direct http protocol', () => {
    expect(isSecureRequest(req('http://example.com/api'))).toBe(false);
  });

  test('returns true when x-forwarded-proto is https, even if url is http', () => {
    expect(
      isSecureRequest(
        req('http://example.com/api', { 'x-forwarded-proto': 'https' }),
      ),
    ).toBe(true);
  });

  test('returns false when x-forwarded-proto is http and url is http', () => {
    expect(
      isSecureRequest(
        req('http://example.com/api', { 'x-forwarded-proto': 'http' }),
      ),
    ).toBe(false);
  });

  test('returns true when url is https and x-forwarded-proto is missing', () => {
    expect(isSecureRequest(req('https://example.com/api'))).toBe(true);
  });

  test('https URL wins even if forward header is http', () => {
    expect(
      isSecureRequest(
        req('https://example.com/api', { 'x-forwarded-proto': 'http' }),
      ),
    ).toBe(true);
  });

  test('uses left-most hop of comma-separated x-forwarded-proto', () => {
    expect(
      isSecureRequest(
        req('http://example.com/api', {
          'x-forwarded-proto': 'https, http',
        }),
      ),
    ).toBe(true);
    expect(
      isSecureRequest(
        req('http://example.com/api', {
          'x-forwarded-proto': 'http, https',
        }),
      ),
    ).toBe(false);
  });

  test('trims and lowercases the forward proto hop', () => {
    expect(
      isSecureRequest(
        req('http://example.com/api', { 'x-forwarded-proto': ' HTTPS ' }),
      ),
    ).toBe(true);
    expect(
      isSecureRequest(
        req('http://example.com/api', { 'x-forwarded-proto': 'Http' }),
      ),
    ).toBe(false);
  });
});
