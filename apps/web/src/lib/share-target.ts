export interface SharedTargetPayload {
  file?: File;
  title?: string;
  text?: string;
  url?: string;
  createdAt: number;
}

const DB_NAME = "sealdrop-share-target";
const STORE_NAME = "incoming";
const PAYLOAD_KEY = "latest";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function withStore<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>) {
  const db = await openDb();
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, mode);
    const request = run(tx.objectStore(STORE_NAME));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    tx.oncomplete = () => db.close();
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

export async function saveSharedTargetPayload(payload: SharedTargetPayload) {
  await withStore("readwrite", (store) => store.put(payload, PAYLOAD_KEY));
}

export async function getSharedTargetPayload() {
  return await withStore<SharedTargetPayload | undefined>("readonly", (store) => store.get(PAYLOAD_KEY));
}

export async function clearSharedTargetPayload() {
  await withStore("readwrite", (store) => store.delete(PAYLOAD_KEY));
}
