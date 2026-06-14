import type { RemorphAlbum, RemorphAlbumStep } from "@/lib/remorph/types";

const LEGACY_STORAGE_KEY = "remorph:albums";
const DB_NAME = "remorph";
const DB_VERSION = 1;
const ALBUMS_STORE = "albums";
const MAX_ALBUMS = 30;

type StorageErrorListener = (message: string) => void;

let cache: RemorphAlbum[] | null = null;
let hydratePromise: Promise<RemorphAlbum[]> | null = null;
const storageErrorListeners = new Set<StorageErrorListener>();

function isBrowser() {
  return typeof window !== "undefined";
}

export function onStorageError(listener: StorageErrorListener): () => void {
  storageErrorListeners.add(listener);
  return () => storageErrorListeners.delete(listener);
}

function notifyStorageError(message: string) {
  storageErrorListeners.forEach((listener) => listener(message));
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(ALBUMS_STORE)) {
        db.createObjectStore(ALBUMS_STORE, { keyPath: "id" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB open failed."));
  });
}

async function readAlbumsFromIdb(): Promise<RemorphAlbum[]> {
  const db = await openDb();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(ALBUMS_STORE, "readonly");
    const request = tx.objectStore(ALBUMS_STORE).getAll();

    request.onsuccess = () => {
      const albums = (request.result as RemorphAlbum[]).sort(
        (left, right) => right.updatedAt - left.updatedAt,
      );
      resolve(albums);
    };
    request.onerror = () =>
      reject(request.error ?? new Error("Could not read albums."));
  });
}

async function writeAlbumsToIdb(albums: RemorphAlbum[]): Promise<void> {
  const db = await openDb();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(ALBUMS_STORE, "readwrite");
    const store = tx.objectStore(ALBUMS_STORE);
    store.clear();

    for (const album of albums) {
      store.put(album);
    }

    tx.oncomplete = () => resolve();
    tx.onerror = () =>
      reject(tx.error ?? new Error("Could not save albums."));
  });
}

function purgeLegacyLocalStorage(): RemorphAlbum[] | null {
  if (!isBrowser()) return null;

  let result: RemorphAlbum[] | null = null;

  try {
    const raw = window.localStorage.getItem(LEGACY_STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as RemorphAlbum[];
        if (Array.isArray(parsed)) result = parsed;
      } catch {
        /* ignore parse errors */
      }
    }
  } catch {
    /* localStorage may be inaccessible */
  }

  try {
    window.localStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch {
    /* ignore — key removal failing is non-critical */
  }

  return result;
}

/* Eagerly clear the key on module load so oversized data can't trigger
   quota errors on any subsequent localStorage operations elsewhere. */
if (isBrowser()) {
  try {
    window.localStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

function mergeAlbums(
  existing: RemorphAlbum[],
  pending: RemorphAlbum[],
): RemorphAlbum[] {
  const byId = new Map<string, RemorphAlbum>();

  for (const album of existing) {
    byId.set(album.id, album);
  }

  for (const album of pending) {
    const previous = byId.get(album.id);
    if (!previous || album.updatedAt >= previous.updatedAt) {
      byId.set(album.id, album);
    }
  }

  return [...byId.values()].sort(
    (left, right) => right.updatedAt - left.updatedAt,
  );
}

if (isBrowser()) {
  cache = [];
}

function trimAlbums(albums: RemorphAlbum[]): RemorphAlbum[] {
  if (albums.length <= MAX_ALBUMS) return albums;
  return albums.slice(0, MAX_ALBUMS);
}

async function persistAlbums(albums: RemorphAlbum[]): Promise<void> {
  const trimmed = trimAlbums(albums);
  cache = trimmed;

  try {
    await writeAlbumsToIdb(trimmed);
  } catch {
    if (trimmed.length > 1) {
      const evicted = trimmed.slice(0, -1);
      cache = evicted;

      try {
        await writeAlbumsToIdb(evicted);
        notifyStorageError(
          "Storage was full — your oldest album was removed to save this change.",
        );
        return;
      } catch {
        /* fall through */
      }
    }

    notifyStorageError(
      "Could not save history. Delete older albums and try again.",
    );
  }
}

function queuePersist(albums: RemorphAlbum[]): void {
  void persistAlbums(albums);
}

export async function hydrateAlbums(): Promise<RemorphAlbum[]> {
  if (!isBrowser()) {
    cache = [];
    return [];
  }

  if (hydratePromise) return hydratePromise;

  hydratePromise = (async () => {
    const pending = cache ?? [];
    let albums = await readAlbumsFromIdb();

    if (albums.length === 0) {
      const legacy = purgeLegacyLocalStorage();
      if (legacy?.length) {
        albums = legacy.sort((left, right) => right.updatedAt - left.updatedAt);
      }
    }

    const merged = trimAlbums(mergeAlbums(albums, pending));
    cache = merged;

    if (merged.length > 0) {
      try {
        await writeAlbumsToIdb(merged);
      } catch {
        notifyStorageError(
          "Could not load saved history. Your current session is still available.",
        );
      }
    }

    return merged;
  })().finally(() => {
    hydratePromise = null;
  });

  return hydratePromise;
}

export function getAlbums(): RemorphAlbum[] {
  return cache ?? [];
}

function writeAlbums(albums: RemorphAlbum[]): void {
  queuePersist(albums);
}

export function saveAlbum(album: RemorphAlbum): void {
  if (!isBrowser()) return;

  const albums = getAlbums();
  const index = albums.findIndex((entry) => entry.id === album.id);

  if (index >= 0) {
    albums[index] = album;
  } else {
    albums.unshift(album);
  }

  writeAlbums([...albums]);
}

export function createAlbum(
  step: RemorphAlbumStep,
  title: string,
): RemorphAlbum {
  const now = step.createdAt;
  const album: RemorphAlbum = {
    id: crypto.randomUUID(),
    title,
    createdAt: now,
    updatedAt: now,
    steps: [step],
  };
  saveAlbum(album);
  return album;
}

export function appendAlbumStep(
  albumId: string,
  step: RemorphAlbumStep,
): RemorphAlbum | null {
  const albums = getAlbums();
  const album = albums.find((entry) => entry.id === albumId);
  if (!album) return null;

  album.steps.push(step);
  album.updatedAt = step.createdAt;
  saveAlbum({ ...album, steps: [...album.steps] });
  return album;
}

export function updateAlbumTitle(albumId: string, title: string): void {
  const albums = getAlbums();
  const album = albums.find((entry) => entry.id === albumId);
  if (!album) return;

  saveAlbum({ ...album, title: title.trim() || album.title });
}

export function deleteAlbum(albumId: string): void {
  if (!isBrowser()) return;
  writeAlbums(getAlbums().filter((entry) => entry.id !== albumId));
}

export type DeleteStepResult = {
  albumRemoved: boolean;
};

export function deleteAlbumStep(
  albumId: string,
  stepId: string,
): DeleteStepResult | null {
  if (!isBrowser()) return null;

  const albums = getAlbums();
  const album = albums.find((entry) => entry.id === albumId);
  if (!album) return null;

  const nextSteps = album.steps.filter((step) => step.id !== stepId);

  if (nextSteps.length === 0) {
    deleteAlbum(albumId);
    return { albumRemoved: true };
  }

  saveAlbum({ ...album, steps: nextSteps, updatedAt: Date.now() });
  return { albumRemoved: false };
}

export function formatAlbumTime(timestamp: number): string {
  return new Date(timestamp).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function truncateTitle(text: string, max = 72): string {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1)}…`;
}
