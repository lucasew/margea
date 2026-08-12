import { useContext, type Context } from 'react';

/**
 * Read a React context that is created as `T | undefined` and throw if missing.
 * Shared by auth / PR / bulk-action hooks so the guard is not copy-pasted.
 */
export function useRequiredContext<T>(
  context: Context<T | undefined>,
  missingMessage: string,
): T {
  const value = useContext(context);
  if (value === undefined) {
    throw new Error(missingMessage);
  }
  return value;
}
