/**
 * Sanitizes a string to prevent injection attacks.
 * Removes '<' and '>' characters.
 * @param input The string to sanitize.
 * @returns The sanitized string.
 */
export function sanitize(input: string | undefined): string | undefined {
  if (!input) {
    return input;
  }
  return input.replace(/[<>]/g, '');
}
