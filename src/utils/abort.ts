export const ABORT_SIGNAL_METADATA_KEY = 'abortSignal';

export function createAbortError(message = 'Aborted'): Error {
  const err = new Error(message);
  err.name = 'AbortError';
  return err;
}

export function isAbortError(err: unknown): boolean {
  return err instanceof Error && err.name === 'AbortError';
}

export function getAbortSignalFromCacheConfig(
  cacheConfig:
    | {
        metadata?: { [key: string]: unknown } | null;
      }
    | null
    | undefined,
): AbortSignal | undefined {
  const signal = cacheConfig?.metadata?.[ABORT_SIGNAL_METADATA_KEY];
  return signal instanceof AbortSignal ? signal : undefined;
}

export function abortableSleep(
  ms: number,
  signal?: AbortSignal,
): Promise<void> {
  if (!signal) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
  if (signal.aborted) {
    return Promise.reject(createAbortError());
  }
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      signal.removeEventListener('abort', onAbort);
      reject(createAbortError());
    };
    signal.addEventListener('abort', onAbort, { once: true });
  });
}
