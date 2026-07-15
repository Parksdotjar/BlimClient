export type CosmeticColorway = {
  id: string;
  slug: string;
  name: string;
  color: string;
  textureRevision: string;
  previewRevision?: string;
  isDefault: boolean;
};

export const activeColorway = <T extends { colorways: CosmeticColorway[] }>(item: T, preferredId?: string | null) =>
  item.colorways.find((colorway) => colorway.id === preferredId)
  || item.colorways.find((colorway) => colorway.isDefault)
  || item.colorways[0]
  || null;
