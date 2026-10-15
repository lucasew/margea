/** Minimal sessionStorage for unit-testing outside the browser. */
export function installMemorySessionStorage(options?: {
  getItem?: (key: string) => string | null;
  setItem?: (key: string, value: string) => void;
}): () => void {
  const store = new Map<string, string>();
  const previous = globalThis.sessionStorage;
  const memoryStorage: Storage = {
    get length() {
      return store.size;
    },
    clear() {
      store.clear();
    },
    getItem(key: string) {
      if (options?.getItem) return options.getItem(key);
      return store.has(key) ? store.get(key)! : null;
    },
    key(index: number) {
      return [...store.keys()][index] ?? null;
    },
    removeItem(key: string) {
      store.delete(key);
    },
    setItem(key: string, value: string) {
      if (options?.setItem) {
        options.setItem(key, value);
        return;
      }
      store.set(key, value);
    },
  };
  Object.defineProperty(globalThis, 'sessionStorage', {
    configurable: true,
    value: memoryStorage,
  });
  return () => {
    Object.defineProperty(globalThis, 'sessionStorage', {
      configurable: true,
      value: previous,
    });
  };
}
