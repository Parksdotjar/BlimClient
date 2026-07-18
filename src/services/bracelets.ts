import { invoke } from "@tauri-apps/api/core";
import type { CosmeticColorway } from "./cosmetics";

export type BraceletArm = "left" | "right";

export type BraceletCatalogItem = {
  id: string;
  name: string;
  collection: string;
  modelRevision: string;
  textureRevision: string;
  previewRevision: string;
  offset: [number, number, number];
  rotation: [number, number, number];
  pivot: [number, number, number];
  scale: number;
  colorways: CosmeticColorway[];
};

export type BraceletPreviewData = { dataUrl: string; revision: string };
export type BraceletAccountState = {
  cartIds: string[];
  collectionIds: string[];
  equippedBraceletId: string | null;
  equippedBraceletColorwayId: string | null;
  equippedBraceletArm: BraceletArm;
};

type RemoteState = Omit<BraceletAccountState, "cartIds">;
type StorageDocument = { schemaVersion: 1; accounts: Record<string, BraceletAccountState> };
const STORAGE_KEY = "bloom-bracelets-v1";
const CATALOG_CACHE_MS = 15_000;
const ACCOUNT_CACHE_MS = 30_000;
const emptyState = (): BraceletAccountState => ({ cartIds: [], collectionIds: [], equippedBraceletId: null, equippedBraceletColorwayId: null, equippedBraceletArm: "right" });
const accountKey = (accountId: string | null) => accountId?.replaceAll("-", "").toLowerCase() || "signed-out";
let catalogCache: { expiresAt: number; items: BraceletCatalogItem[] } | null = null;
let catalogRequest: Promise<BraceletCatalogItem[]> | null = null;
const accountCache = new Map<string, { expiresAt: number; state: BraceletAccountState }>();
const accountRequests = new Map<string, Promise<BraceletAccountState>>();

const readDocument = (): StorageDocument => {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "") as StorageDocument;
    if (parsed?.schemaVersion === 1 && parsed.accounts && typeof parsed.accounts === "object") return parsed;
  } catch { /* Ignore damaged local cache. */ }
  return { schemaVersion: 1, accounts: {} };
};

const sanitize = (value: Partial<BraceletAccountState> | undefined): BraceletAccountState => {
  const collectionIds = Array.isArray(value?.collectionIds) ? [...new Set(value.collectionIds.filter((id): id is string => typeof id === "string"))] : [];
  const cartIds = Array.isArray(value?.cartIds) ? [...new Set(value.cartIds.filter((id): id is string => typeof id === "string" && !collectionIds.includes(id)))] : [];
  const equippedBraceletId = typeof value?.equippedBraceletId === "string" && collectionIds.includes(value.equippedBraceletId) ? value.equippedBraceletId : null;
  return {
    cartIds,
    collectionIds,
    equippedBraceletId,
    equippedBraceletColorwayId: equippedBraceletId && typeof value?.equippedBraceletColorwayId === "string" ? value.equippedBraceletColorwayId : null,
    equippedBraceletArm: value?.equippedBraceletArm === "left" ? "left" : "right",
  };
};

export const loadBraceletAccountState = (accountId: string | null) => sanitize(readDocument().accounts[accountKey(accountId)] || emptyState());
export const saveBraceletAccountState = (accountId: string | null, state: BraceletAccountState) => {
  const document = readDocument();
  const next = sanitize(state);
  const key = accountKey(accountId);
  document.accounts[key] = next;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(document));
  accountCache.set(key, { expiresAt: Date.now() + ACCOUNT_CACHE_MS, state: next });
  return next;
};

const listCatalog = () => {
  if (catalogCache && catalogCache.expiresAt > Date.now()) return Promise.resolve(catalogCache.items);
  if (catalogRequest) return catalogRequest;
  catalogRequest = invoke<BraceletCatalogItem[]>("list_bloom_bracelets").then((items) => {
    catalogCache = { expiresAt: Date.now() + CATALOG_CACHE_MS, items };
    return items;
  }).finally(() => { catalogRequest = null; });
  return catalogRequest;
};

const loadAccountState = (accountId: string | null) => {
  const local = loadBraceletAccountState(accountId);
  if (!accountId) return Promise.resolve(local);
  const key = accountKey(accountId);
  const cached = accountCache.get(key);
  if (cached && cached.expiresAt > Date.now()) return Promise.resolve(cached.state);
  const active = accountRequests.get(key);
  if (active) return active;
  const request = invoke<RemoteState>("get_bloom_bracelet_account_state").then((remote) => saveBraceletAccountState(accountId, { ...local, ...remote }))
    .catch((error) => { if (cached || local.collectionIds.length || local.equippedBraceletId) return local; throw error; })
    .finally(() => { accountRequests.delete(key); });
  accountRequests.set(key, request);
  return request;
};

export const braceletProvider = {
  listCatalog,
  loadPreviewData: (braceletId: string, colorwayId?: string | null) => invoke<BraceletPreviewData>("load_bloom_bracelet_preview_data", { braceletId, colorwayId: colorwayId || null }),
  loadAccountState,
  addToCollection: (_accountId: string | null, braceletIds: string[]) => invoke<void>("add_bloom_bracelets_to_collection", { braceletIds }),
  setEquipped: (_accountId: string | null, braceletId: string | null, colorwayId: string | null, arm: BraceletArm) => invoke<void>("set_bloom_equipped_bracelet", { braceletId, colorwayId, arm }),
};
