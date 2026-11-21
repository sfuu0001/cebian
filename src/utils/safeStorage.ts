const memoryStorage = new Map<string, string>();

export function safeGetStorage<T>(key: string, defaultValue: T): T {
  try {
    const raw =
      typeof window !== 'undefined' && window.localStorage
        ? window.localStorage.getItem(key)
        : memoryStorage.get(key) ?? null;

    if (raw === null || raw === undefined) {
      return defaultValue;
    }
    return JSON.parse(raw) as T;
  } catch {
    return defaultValue;
  }
}

export function safeSetStorage<T>(key: string, value: T): void {
  try {
    if (value === null || value === undefined) {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
      }
      memoryStorage.delete(key);
      return;
    }
    const serialized = JSON.stringify(value);
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, serialized);
    }
    memoryStorage.set(key, serialized);
  } catch {
    // Ignore storage quota or sandbox restrictions
  }
}
