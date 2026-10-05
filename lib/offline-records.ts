"use client";

type Stored = { key: string; owner: string; id: string; kind: string; data: any; updated: number; pending?: boolean; pendingDelete?: boolean };
const DB_NAME = "lakbay-offline-v1";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore("records", { keyPath: "key" });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function recordId(kind: string, data: any) {
  return ["profile", "preferences", "inbox", "rider"].includes(kind) ? kind : String(data.id);
}

export async function cacheRecords(owner: string, records: Array<{ id: string; kind: string; data: any }>) {
  if (!owner || !globalThis.indexedDB) return;
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction("records", "readwrite");
    const store = tx.objectStore("records");
    for (const item of records) store.put({ key: `${owner}:${item.id}`, owner, id: item.id, kind: item.kind, data: item.data, updated: Date.now() } satisfies Stored);
    tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function readCachedRecords(owner: string) {
  if (!owner || !globalThis.indexedDB) return null;
  const db = await openDb();
  const rows = await new Promise<Stored[]>((resolve, reject) => {
    const request = db.transaction("records").objectStore("records").getAll();
    request.onsuccess = () => resolve((request.result as Stored[]).filter(row => row.owner === owner && !row.pendingDelete));
    request.onerror = () => reject(request.error);
  });
  db.close();
  return rows.length ? rows.map(({ id, kind, data }) => ({ id, kind, data })) : null;
}

export async function cacheRecord(owner: string, kind: string, data: any, pending = true) {
  if (!owner || !globalThis.indexedDB) return;
  const db = await openDb(), id = recordId(kind, data);
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction("records", "readwrite");
    const row: Stored = { key: `${owner}:${id}`, owner, id, kind, data, updated: Date.now(), pending };
    if (!pending) delete row.pending;
    tx.objectStore("records").put(row);
    tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function deleteCachedRecord(owner: string, id: string, kind: string, queue = false) {
  if (!owner || !globalThis.indexedDB) return;
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction("records", "readwrite"), store = tx.objectStore("records");
    if (queue) store.put({ key: `${owner}:${id}`, owner, id, kind, data: null, updated: Date.now(), pendingDelete: true } satisfies Stored);
    else store.delete(`${owner}:${id}`);
    tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function syncCachedRecords(owner: string) {
  if (!owner || !globalThis.indexedDB || !navigator.onLine) return;
  const db = await openDb();
  const pending = await new Promise<Stored[]>((resolve, reject) => {
    const request = db.transaction("records").objectStore("records").getAll();
    request.onsuccess = () => resolve((request.result as Stored[]).filter(row => row.owner === owner && (row.pending || row.pendingDelete)));
    request.onerror = () => reject(request.error);
  });
  db.close();
  for (const row of pending) {
    const response = row.pendingDelete
      ? await fetch(`/api/records?id=${encodeURIComponent(row.id)}&kind=${row.kind}`, { method: "DELETE" })
      : await fetch("/api/records", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind: row.kind, data: row.data }) });
    if (!response.ok) throw Error("Some offline changes are still waiting to sync.");
    if(row.pendingDelete){await deleteCachedRecord(owner,row.id,row.kind,false);continue;}
    const clean = { ...row }; delete clean.pending;
    const writeDb = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = writeDb.transaction("records", "readwrite"); tx.objectStore("records").put(clean);
      tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error);
    });
    writeDb.close();
  }
}
