// Local, client-side portrait storage. Uses IndexedDB (not localStorage) since
// data-URL images quickly blow localStorage's ~5-10MB quota. No backend
// required — this is the free-tier-first design: a Firebase Storage-backed
// sync layer is a natural upgrade path later, not a prerequisite for MVP.

const DB_NAME = 'ultimate-auction-portraits';
const STORE_NAME = 'portraits';
const DB_VERSION = 1;
const MAX_DIMENSION = 512;
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5MB
const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

export interface PortraitAsset {
  assetId: string;
  playerId: string;
  uploadedAt: string;
  mimeType: string;
  width: number;
  height: number;
  blob: Blob;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'assetId' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export function validateUploadFile(file: File): { ok: boolean; reason?: string } {
  if (!ACCEPTED_TYPES.includes(file.type)) {
    return { ok: false, reason: 'Please choose a PNG, JPEG, or WEBP image.' };
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return { ok: false, reason: 'Image must be under 5MB.' };
  }
  return { ok: true };
}

/** Downscales to MAX_DIMENSION on the longest edge and re-encodes as WEBP, so stored payloads stay small. */
export async function processUploadFile(file: File): Promise<{ blob: Blob; width: number; height: number }> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas not supported');
  ctx.drawImage(bitmap, 0, 0, width, height);

  const blob: Blob = await new Promise((resolve, reject) => {
    canvas.toBlob(b => (b ? resolve(b) : reject(new Error('Encoding failed'))), 'image/webp', 0.9);
  });

  return { blob, width, height };
}

export async function savePortrait(playerId: string, file: File): Promise<PortraitAsset> {
  const { blob, width, height } = await processUploadFile(file);
  const asset: PortraitAsset = {
    assetId: `portrait_${playerId}_${Date.now()}`,
    playerId,
    uploadedAt: new Date().toISOString(),
    mimeType: 'image/webp',
    width,
    height,
    blob
  };

  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(asset);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });

  return asset;
}

export async function getPortraitObjectUrl(assetId: string): Promise<string | null> {
  const db = await openDb();
  const asset = await new Promise<PortraitAsset | undefined>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).get(assetId);
    req.onsuccess = () => resolve(req.result as PortraitAsset | undefined);
    req.onerror = () => reject(req.error);
  });
  if (!asset) return null;
  return URL.createObjectURL(asset.blob);
}

export async function deletePortrait(assetId: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(assetId);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
