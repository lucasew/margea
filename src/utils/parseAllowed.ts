/**
 * Return `value` when it passes `isAllowed`, otherwise `fallback`.
 * Shared by URL/session parsers so allowed-set checks stay consistent.
 */
export function parseAllowed<T extends string>(
  value: string | null | undefined,
  isAllowed: (value: string) => value is T,
  fallback: T,
): T {
  if (value && isAllowed(value)) return value;
  return fallback;
}
