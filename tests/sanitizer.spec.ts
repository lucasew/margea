import { test, expect } from '@playwright/test';
import { sanitize } from '../src/services/sanitizer';

test.describe('sanitize', () => {
  test('should allow valid characters', ({}) => {
    const validInput = 'a-zA-Z0-9-_.';
    expect(sanitize(validInput)).toBe(validInput);
  });

  test('should remove malicious characters', ({}) => {
    const maliciousInput = '<script>alert("XSS")</script>';
    const sanitizedInput = 'scriptalertXSSscript';
    expect(sanitize(maliciousInput)).toBe(sanitizedInput);
  });

  test('should handle mixed valid and invalid characters', ({}) => {
    const mixedInput = 'valid-repo-name<>';
    const sanitizedInput = 'valid-repo-name';
    expect(sanitize(mixedInput)).toBe(sanitizedInput);
  });

  test('should handle empty string', ({}) => {
    const emptyInput = '';
    const sanitizedInput = '';
    expect(sanitize(emptyInput)).toBe(sanitizedInput);
  });
});
