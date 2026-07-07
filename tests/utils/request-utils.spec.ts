import { expect, test } from '@playwright/test';
import { isSecureRequest } from '../../src/utils/requestUtils';

test.describe('isSecureRequest', () => {
  test('returns true for direct https protocol', () => {
    const request = new Request('https://example.com/api', {
      headers: new Headers(),
    });
    expect(isSecureRequest(request)).toBe(true);
  });

  test('returns false for direct http protocol', () => {
    const request = new Request('http://example.com/api', {
      headers: new Headers(),
    });
    expect(isSecureRequest(request)).toBe(false);
  });

  test('returns true when x-forwarded-proto is https, even if url is http', () => {
    const request = new Request('http://example.com/api', {
      headers: new Headers({
        'x-forwarded-proto': 'https',
      }),
    });
    expect(isSecureRequest(request)).toBe(true);
  });

  test('returns false when x-forwarded-proto is http and url is http', () => {
    const request = new Request('http://example.com/api', {
      headers: new Headers({
        'x-forwarded-proto': 'http',
      }),
    });
    expect(isSecureRequest(request)).toBe(false);
  });

  test('returns true when url is https and x-forwarded-proto is missing', () => {
    const request = new Request('https://example.com/api');
    expect(isSecureRequest(request)).toBe(true);
  });
});
