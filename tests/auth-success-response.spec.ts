import { test, expect } from '@playwright/test';
import { createSuccessResponse } from '../src/pages/api/auth/utils';

test.describe('createSuccessResponse', () => {
  test('returns JSON success with no-store Cache-Control by default', async () => {
    const response = createSuccessResponse();
    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('application/json');
    expect(response.headers.get('Cache-Control')).toBe(
      'no-store, no-cache, must-revalidate',
    );
    await expect(response.json()).resolves.toEqual({ success: true });
  });

  test('allows extra headers and override of Cache-Control', async () => {
    const response = createSuccessResponse({
      'X-Test': '1',
      'Cache-Control': 'private, max-age=0',
    });
    expect(response.headers.get('X-Test')).toBe('1');
    expect(response.headers.get('Cache-Control')).toBe('private, max-age=0');
    expect(response.headers.get('Content-Type')).toBe('application/json');
  });
});
