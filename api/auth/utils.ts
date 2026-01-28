
/**
 * Derives a 32-byte key from the session secret using SHA-256.
 * This ensures the key is the correct length for A256GCM encryption.
 *
 * @param secret The raw session secret string (from env vars).
 * @returns A Promise resolving to the 32-byte key as a Uint8Array.
 */
export async function getSecretKey(secret: string): Promise<Uint8Array> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const hash = await crypto.subtle.digest('SHA-256', keyData);
  return new Uint8Array(hash);
}
