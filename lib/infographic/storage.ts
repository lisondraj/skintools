export interface InfographicHistoryEntry {
  id: string;
  diagnosis: string;
  language: string;
  variant: "A" | "B";
  image: string; // base64 PNG data URL
  createdAt: number;
}

const DB_NAME = "infographic";
const DB_VERSION = 1;
const STORE = "history";
const MAX_ENTRIES = 20;

let cache: InfographicHistoryEntry[] | null = null;
let hydratePromise: Promise<InfographicHistoryEntry[]> | null = null;

function isBrowser() {
  return typeof window !== "undefined";
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB open failed."));
  });
}

async function readFromIdb(): Promise<InfographicHistoryEntry[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => {
      const entries = (req.result as InfographicHistoryEntry[]).sort(
        (a, b) => b.createdAt - a.createdAt,
      );
      resolve(entries);
    };
    req.onerror = () => reject(req.error ?? new Error("Could not read history."));
  });
}

async function writeToIdb(entries: InfographicHistoryEntry[]): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    const store = tx.objectStore(STORE);
    store.clear();
    for (const entry of entries) store.put(entry);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("Could not save history."));
  });
}

function trim(entries: InfographicHistoryEntry[]): InfographicHistoryEntry[] {
  return entries.length <= MAX_ENTRIES ? entries : entries.slice(0, MAX_ENTRIES);
}

async function persist(entries: InfographicHistoryEntry[]): Promise<void> {
  const trimmed = trim(entries);
  cache = trimmed;
  try {
    await writeToIdb(trimmed);
  } catch {
    /* storage full — silently drop, cache still reflects state */
  }
}

export async function hydrateHistory(): Promise<InfographicHistoryEntry[]> {
  if (!isBrowser()) { cache = []; return []; }
  if (hydratePromise) return hydratePromise;

  hydratePromise = (async () => {
    const entries = await readFromIdb();
    cache = trim(entries);
    return cache;
  })().finally(() => { hydratePromise = null; });

  return hydratePromise;
}

export function getHistory(): InfographicHistoryEntry[] {
  return cache ?? [];
}

export function saveHistoryEntry(entry: InfographicHistoryEntry): void {
  if (!isBrowser()) return;
  const existing = getHistory().filter((e) => e.id !== entry.id);
  void persist([entry, ...existing]);
}

export function deleteHistoryEntry(id: string): void {
  if (!isBrowser()) return;
  void persist(getHistory().filter((e) => e.id !== id));
}

export function formatHistoryTime(ts: number): string {
  return new Date(ts).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
