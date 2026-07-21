import { invoke } from "@tauri-apps/api/core";
import type { CosmeticColorway } from "./cosmetics";
import {
  cosmeticAccountKey,
  createKeyedRequestCache,
  createSingletonRequestCache,
  readCosmeticAccounts,
  uniqueStringIds,
} from "./cosmeticCache";

export type WingCatalogItem = {
  id: string;
  name: string;
  collection: string;
  modelRevision: string;
  textureRevision: string;
  previewRevision: string;
  offset: [number, number, number];
  scale: number;
  hideCape: boolean;
  colorways: CosmeticColorway[];
};

export type WingPreviewData = { dataUrl: string; revision: string };

export type WingAccountState = {
  cartIds: string[];
  collectionIds: string[];
  equippedWingId: string | null;
  equippedWingColorwayId: string | null;
};

type RemoteWingAccountState = { collectionIds: string[]; equippedWingId: string | null; equippedWingColorwayId: string | null };

const STORAGE_KEY = "bloom-wings-v1";
const CATALOG_CACHE_MS = 15_000;
const ACCOUNT_CACHE_MS = 30_000;
const emptyState = (): WingAccountState => ({ cartIds: [], collectionIds: [], equippedWingId: null, equippedWingColorwayId: null });
const loadCachedCatalog = createSingletonRequestCache<WingCatalogItem[]>(CATALOG_CACHE_MS);
const loadCachedPreview = createKeyedRequestCache<WingPreviewData>(5 * 60_000);
const accountCache = new Map<string, { expiresAt: number; state: WingAccountState }>();
const accountRequests = new Map<string, Promise<WingAccountState>>();

const readDocument = () => readCosmeticAccounts<WingAccountState>(STORAGE_KEY);

const sanitize = (value: Partial<WingAccountState> | undefined): WingAccountState => {
  const collectionIds = uniqueStringIds(value?.collectionIds);
  const cartIds = uniqueStringIds(value?.cartIds).filter(id => !collectionIds.includes(id));
  const equippedWingId = typeof value?.equippedWingId === "string" && collectionIds.includes(value.equippedWingId) ? value.equippedWingId : null;
  const equippedWingColorwayId = equippedWingId && typeof value?.equippedWingColorwayId === "string" ? value.equippedWingColorwayId : null;
  return { cartIds, collectionIds, equippedWingId, equippedWingColorwayId };
};

export const loadWingAccountState = (accountId: string | null) => sanitize(readDocument().accounts[cosmeticAccountKey(accountId)] || emptyState());

export const saveWingAccountState = (accountId: string | null, state: WingAccountState) => {
  const document = readDocument();
  const next = sanitize(state);
  const key = cosmeticAccountKey(accountId);
  document.accounts[key] = next;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(document));
  accountCache.set(key, { expiresAt: Date.now() + ACCOUNT_CACHE_MS, state: next });
  return next;
};

const listCatalog = () => {
  return loadCachedCatalog(() => invoke<WingCatalogItem[]>("list_bloom_wings"));
};

const loadAccountState = (accountId: string | null) => {
  const local = loadWingAccountState(accountId);
  if (!accountId) return Promise.resolve(local);
  const key = cosmeticAccountKey(accountId);
  const cached = accountCache.get(key);
  if (cached && cached.expiresAt > Date.now()) return Promise.resolve(cached.state);
  const active = accountRequests.get(key);
  if (active) return active;
  const request = invoke<RemoteWingAccountState>("get_bloom_wing_account_state")
    .then((remote) => saveWingAccountState(accountId, { ...local, collectionIds: remote.collectionIds, equippedWingId: remote.equippedWingId, equippedWingColorwayId: remote.equippedWingColorwayId }))
    .catch((error) => {
      if (cached || local.collectionIds.length || local.equippedWingId) return local;
      throw error;
    })
    .finally(() => { accountRequests.delete(key); });
  accountRequests.set(key, request);
  return request;
};

export const wingProvider = {
  listCatalog,
  loadPreviewData: (wingId: string, colorwayId?: string | null) => loadCachedPreview(
    `${wingId}:${colorwayId || "default"}`,
    () => invoke<WingPreviewData>("load_bloom_wing_preview_data", { wingId, colorwayId: colorwayId || null }),
  ),
  loadAccountState,
  addToCollection: (_accountId: string | null, wingIds: string[]) => invoke<void>("add_bloom_wings_to_collection", { wingIds }),
  setEquipped: (_accountId: string | null, wingId: string | null, colorwayId?: string | null) => invoke<void>("set_bloom_equipped_wing", { wingId, colorwayId: colorwayId || null }),
};
