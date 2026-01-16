const SANITIZE_REGEX = /[<>'"']/g;

/**
 * Sanitizes a string to prevent injection attacks.
 * Removes '<' and '>' characters.
 * @param input The string to sanitize.
 * @returns The sanitized string.
 */
export function sanitize(input: string | null | undefined): string | undefined {
  if (input === null || input === undefined) {
    return undefined;
  }
  // 🛡️ SENTINEL: Strip characters that could be used for XSS.
  // This is a defense-in-depth measure, as React's JSX escaping
  // should prevent most attacks. However, it's crucial to sanitize
  // any user-controlled input that is reflected in the UI.
  return input.replace(SANITIZE_REGEX, '');
}
