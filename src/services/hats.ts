import { invoke } from "@tauri-apps/api/core";
import type { CosmeticColorway } from "./cosmetics";
import {
  cosmeticAccountKey,
  createKeyedRequestCache,
  createSingletonRequestCache,
  readCosmeticAccounts,
  uniqueStringIds,
} from "./cosmeticCache";

export type HatCatalogItem = {
  id: string;
  name: string;
  collection: string;
  modelRevision: string;
  textureRevision: string;
  previewRevision: string;
  offset: [number, number, number];
  scale: number;
  hideWithHelmet: boolean;
  colorways: CosmeticColorway[];
};

export type HatPreviewData = { dataUrl: string; revision: string };

export type HatAccountState = {
  cartIds: string[];
  collectionIds: string[];
  equippedHatId: string | null;
  equippedHatColorwayId: string | null;
};

type RemoteHatAccountState = { collectionIds: string[]; equippedHatId: string | null; equippedHatColorwayId: string | null };

const STORAGE_KEY = "bloom-hats-v1";
const CATALOG_CACHE_MS = 15_000;
const ACCOUNT_CACHE_MS = 30_000;
const emptyState = (): HatAccountState => ({ cartIds: [], collectionIds: [], equippedHatId: null, equippedHatColorwayId: null });
const loadCachedCatalog = createSingletonRequestCache<HatCatalogItem[]>(CATALOG_CACHE_MS);
const loadCachedPreview = createKeyedRequestCache<HatPreviewData>(5 * 60_000);
const accountCache = new Map<string, { expiresAt: number; state: HatAccountState }>();
const accountRequests = new Map<string, Promise<HatAccountState>>();

const readDocument = () => readCosmeticAccounts<HatAccountState>(STORAGE_KEY);

const sanitize = (value: Partial<HatAccountState> | undefined): HatAccountState => {
  const collectionIds = uniqueStringIds(value?.collectionIds);
  const cartIds = uniqueStringIds(value?.cartIds).filter(id => !collectionIds.includes(id));
  const equippedHatId = typeof value?.equippedHatId === "string" && collectionIds.includes(value.equippedHatId) ? value.equippedHatId : null;
  const equippedHatColorwayId = equippedHatId && typeof value?.equippedHatColorwayId === "string" ? value.equippedHatColorwayId : null;
  return { cartIds, collectionIds, equippedHatId, equippedHatColorwayId };
};

export const loadHatAccountState = (accountId: string | null) => sanitize(readDocument().accounts[cosmeticAccountKey(accountId)] || emptyState());

export const saveHatAccountState = (accountId: string | null, state: HatAccountState) => {
  const document = readDocument();
  const next = sanitize(state);
  const key = cosmeticAccountKey(accountId);
  document.accounts[key] = next;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(document));
  accountCache.set(key, { expiresAt: Date.now() + ACCOUNT_CACHE_MS, state: next });
  return next;
};

const listCatalog = (force = false) => {
  return loadCachedCatalog(() => invoke<HatCatalogItem[]>("list_bloom_hats"), force);
};

const loadAccountState = (accountId: string | null) => {
  const local = loadHatAccountState(accountId);
  if (!accountId) return Promise.resolve(local);
  const key = cosmeticAccountKey(accountId);
  const cached = accountCache.get(key);
  if (cached && cached.expiresAt > Date.now()) return Promise.resolve(cached.state);
  const active = accountRequests.get(key);
  if (active) return active;
  const request = invoke<RemoteHatAccountState>("get_bloom_hat_account_state")
    .then((remote) => saveHatAccountState(accountId, { ...local, collectionIds: remote.collectionIds, equippedHatId: remote.equippedHatId, equippedHatColorwayId: remote.equippedHatColorwayId }))
    .catch((error) => {
      if (cached || local.collectionIds.length || local.equippedHatId) return local;
      throw error;
    })
    .finally(() => { accountRequests.delete(key); });
  accountRequests.set(key, request);
  return request;
};

export const hatProvider = {
  listCatalog,
  loadPreviewData: (hatId: string, colorwayId?: string | null) => loadCachedPreview(
    `${hatId}:${colorwayId || "default"}`,
    () => invoke<HatPreviewData>("load_bloom_hat_preview_data", { hatId, colorwayId: colorwayId || null }),
  ),
  loadAccountState,
  addToCollection: (_accountId: string | null, hatIds: string[]) => invoke<void>("add_bloom_hats_to_collection", { hatIds }),
  setEquipped: (_accountId: string | null, hatId: string | null, colorwayId?: string | null) => invoke<void>("set_bloom_equipped_hat", { hatId, colorwayId: colorwayId || null }),
};
