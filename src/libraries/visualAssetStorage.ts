import type { VisualAsset } from "../types/editor";

const databaseName = "neoform-pigments";
const databaseVersion = 1;
const visualAssetsStoreName = "visual-assets";

export async function loadVisualAssetsFromIndexedDb(): Promise<VisualAsset[]> {
  const database = await openVisualAssetsDatabase();

  if (!database) {
    return [];
  }

  return new Promise<VisualAsset[]>((resolve, reject) => {
    const transaction = database.transaction(visualAssetsStoreName, "readonly");
    const store = transaction.objectStore(visualAssetsStoreName);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result.filter(isVisualAsset));
    request.onerror = () => reject(request.error);
  }).finally(() => database.close());
}

export async function saveVisualAssetToIndexedDb(asset: VisualAsset) {
  const database = await openVisualAssetsDatabase();

  if (!database) {
    return;
  }

  await writeVisualAssetTransaction(database, [asset], "put");
  database.close();
}

export async function deleteVisualAssetFromIndexedDb(id: string) {
  const database = await openVisualAssetsDatabase();

  if (!database) {
    return;
  }

  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(visualAssetsStoreName, "readwrite");
    const store = transaction.objectStore(visualAssetsStoreName);

    store.delete(id);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  }).finally(() => database.close());
}

export async function replaceVisualAssetsInIndexedDb(assets: VisualAsset[]) {
  const database = await openVisualAssetsDatabase();

  if (!database) {
    return;
  }

  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(visualAssetsStoreName, "readwrite");
    const store = transaction.objectStore(visualAssetsStoreName);

    store.clear();
    assets.forEach((asset) => store.put(asset));
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  }).finally(() => database.close());
}

async function openVisualAssetsDatabase() {
  if (typeof indexedDB === "undefined") {
    return null;
  }

  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(databaseName, databaseVersion);

    request.onupgradeneeded = () => {
      const database = request.result;

      if (!database.objectStoreNames.contains(visualAssetsStoreName)) {
        const store = database.createObjectStore(visualAssetsStoreName, {
          keyPath: "id"
        });
        store.createIndex("category", "category", { unique: false });
        store.createIndex("createdAt", "createdAt", { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function writeVisualAssetTransaction(
  database: IDBDatabase,
  assets: VisualAsset[],
  action: "put" | "add"
) {
  return new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(visualAssetsStoreName, "readwrite");
    const store = transaction.objectStore(visualAssetsStoreName);

    assets.forEach((asset) => store[action](asset));
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

function isVisualAsset(value: unknown): value is VisualAsset {
  if (!value || typeof value !== "object") {
    return false;
  }

  const asset = value as Partial<VisualAsset>;

  return (
    typeof asset.id === "string" &&
    typeof asset.name === "string" &&
    typeof asset.dataUrl === "string" &&
    typeof asset.mimeType === "string" &&
    typeof asset.createdAt === "string" &&
    (asset.category === "compositions" ||
      asset.category === "pigments" ||
      asset.category === "pigment-mixes" ||
      asset.category === "color-palettes" ||
      asset.category === "textures" ||
      asset.category === "final-works")
  );
}
