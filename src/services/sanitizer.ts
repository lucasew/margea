/**
 * Sanitizes a string to prevent XSS attacks.
 * It allows only alphanumeric characters, hyphens, underscores, and periods.
 * @param input The string to sanitize.
 * @returns The sanitized string.
 */
export function sanitize(input: string): string {
  return input.replace(/[^a-zA-Z0-9-_\.]/g, '');
}
