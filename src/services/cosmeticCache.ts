export type CosmeticAccountDocument<T> = {
  schemaVersion: 1;
  accounts: Record<string, T>;
};

export const cosmeticAccountKey = (accountId: string | null) =>
  accountId?.replaceAll("-", "").trim().toLowerCase() || "signed-out";

export const uniqueStringIds = (value: unknown): string[] => Array.isArray(value)
  ? [...new Set(value.filter((item): item is string => typeof item === "string" && item.length > 0))]
  : [];

export function readCosmeticAccounts<T>(storageKey: string): CosmeticAccountDocument<T> {
  try {
    const parsed = JSON.parse(localStorage.getItem(storageKey) || "null") as Partial<CosmeticAccountDocument<T>> | null;
    if (parsed?.schemaVersion === 1 && parsed.accounts && typeof parsed.accounts === "object") {
      return { schemaVersion: 1, accounts: parsed.accounts as Record<string, T> };
    }
  } catch {
    // A damaged local cosmetic cache must never block Bloom from opening.
  }
  return { schemaVersion: 1, accounts: {} };
}

export function createSingletonRequestCache<T>(ttlMs: number) {
  let cached: { expiresAt: number; value: T } | null = null;
  let active: Promise<T> | null = null;

  return (loader: () => Promise<T>, force = false): Promise<T> => {
    if (force) cached = null;
    if (cached && cached.expiresAt > Date.now()) return Promise.resolve(cached.value);
    if (active) return active;

    active = loader()
      .then((value) => {
        cached = { expiresAt: Date.now() + ttlMs, value };
        return value;
      })
      .finally(() => { active = null; });
    return active;
  };
}

export function createKeyedRequestCache<T>(ttlMs: number, maxEntries = 48) {
  const cached = new Map<string, { expiresAt: number; value: T }>();
  const active = new Map<string, Promise<T>>();

  return (key: string, loader: () => Promise<T>): Promise<T> => {
    const existing = cached.get(key);
    if (existing && existing.expiresAt > Date.now()) {
      cached.delete(key);
      cached.set(key, existing);
      return Promise.resolve(existing.value);
    }
    if (existing) cached.delete(key);

    const pending = active.get(key);
    if (pending) return pending;

    const request = loader()
      .then((value) => {
        cached.set(key, { expiresAt: Date.now() + ttlMs, value });
        while (cached.size > maxEntries) {
          const oldest = cached.keys().next().value as string | undefined;
          if (oldest === undefined) break;
          cached.delete(oldest);
        }
        return value;
      })
      .finally(() => { active.delete(key); });
    active.set(key, request);
    return request;
  };
}
