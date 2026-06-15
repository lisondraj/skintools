import type { Deck, PatientSimConfig, Slide, SlideElement } from "./types";
import { DEFAULT_PATIENT_SIM } from "./types";

const DB_NAME = "modules";
const DB_VERSION = 1;
const DECK_STORE = "decks";
const ACTIVE_DECK_KEY = "modules:active-deck-id";

type StorageErrorListener = (message: string) => void;

let cache: Deck | null = null;
let hydratePromise: Promise<Deck | null> | null = null;
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
      if (!db.objectStoreNames.contains(DECK_STORE)) {
        db.createObjectStore(DECK_STORE, { keyPath: "id" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error("IndexedDB open failed."));
  });
}

async function readDeckFromIdb(id: string): Promise<Deck | null> {
  const db = await openDb();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(DECK_STORE, "readonly");
    const request = tx.objectStore(DECK_STORE).get(id);

    request.onsuccess = () => resolve((request.result as Deck) ?? null);
    request.onerror = () =>
      reject(request.error ?? new Error("Could not read deck."));
  });
}

async function writeDeckToIdb(deck: Deck): Promise<void> {
  const db = await openDb();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(DECK_STORE, "readwrite");
    tx.objectStore(DECK_STORE).put(deck);

    tx.oncomplete = () => resolve();
    tx.onerror = () =>
      reject(tx.error ?? new Error("Could not save deck."));
  });
}

function getActiveDeckId(): string | null {
  if (!isBrowser()) return null;
  try {
    return window.localStorage.getItem(ACTIVE_DECK_KEY);
  } catch {
    return null;
  }
}

function setActiveDeckId(id: string) {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(ACTIVE_DECK_KEY, id);
  } catch {
    /* ignore */
  }
}

async function persistDeck(deck: Deck): Promise<void> {
  cache = deck;
  setActiveDeckId(deck.id);

  try {
    await writeDeckToIdb(deck);
  } catch {
    notifyStorageError(
      "Could not save your deck. Free up browser storage and try again.",
    );
  }
}

function queuePersist(deck: Deck): void {
  void persistDeck(deck);
}

export function createEmptySlide(kind: Slide["kind"] = "content"): Slide {
  return {
    id: crypto.randomUUID(),
    kind,
    background: "#ffffff",
    elements: [],
    sim: kind === "patient-sim" ? { ...DEFAULT_PATIENT_SIM } : undefined,
  };
}

export function createDefaultDeck(title = "Untitled presentation"): Deck {
  const now = Date.now();
  return {
    id: crypto.randomUUID(),
    title,
    slides: [createEmptySlide("content")],
    createdAt: now,
    updatedAt: now,
  };
}

export async function hydrateDeck(): Promise<Deck | null> {
  if (!isBrowser()) {
    cache = null;
    return null;
  }

  if (hydratePromise) return hydratePromise;

  hydratePromise = (async () => {
    if (cache) return cache;

    const activeId = getActiveDeckId();
    if (activeId) {
      const stored = await readDeckFromIdb(activeId);
      if (stored) {
        cache = stored;
        return stored;
      }
    }

    const deck = createDefaultDeck();
    cache = deck;
    await persistDeck(deck);
    return deck;
  })().finally(() => {
    hydratePromise = null;
  });

  return hydratePromise;
}

export function getDeck(): Deck | null {
  return cache;
}

export function saveDeck(deck: Deck): void {
  if (!isBrowser()) return;
  queuePersist({ ...deck, updatedAt: Date.now() });
}

export function updateDeckTitle(title: string): Deck | null {
  const deck = getDeck();
  if (!deck) return null;
  const next = { ...deck, title: title.trim() || deck.title, updatedAt: Date.now() };
  saveDeck(next);
  return next;
}

export function updateSlide(slideId: string, updater: (slide: Slide) => Slide): Deck | null {
  const deck = getDeck();
  if (!deck) return null;

  const slides = deck.slides.map((slide) =>
    slide.id === slideId ? updater(slide) : slide,
  );
  const next = { ...deck, slides, updatedAt: Date.now() };
  saveDeck(next);
  return next;
}

export function addSlide(kind: Slide["kind"] = "content"): Deck | null {
  const deck = getDeck();
  if (!deck) return null;
  const next = {
    ...deck,
    slides: [...deck.slides, createEmptySlide(kind)],
    updatedAt: Date.now(),
  };
  saveDeck(next);
  return next;
}

export function deleteSlide(slideId: string): Deck | null {
  const deck = getDeck();
  if (!deck || deck.slides.length <= 1) return deck;

  const slides = deck.slides.filter((slide) => slide.id !== slideId);
  const next = { ...deck, slides, updatedAt: Date.now() };
  saveDeck(next);
  return next;
}

export function reorderSlides(fromIndex: number, toIndex: number): Deck | null {
  const deck = getDeck();
  if (!deck) return null;

  const slides = [...deck.slides];
  const [moved] = slides.splice(fromIndex, 1);
  slides.splice(toIndex, 0, moved);

  const next = { ...deck, slides, updatedAt: Date.now() };
  saveDeck(next);
  return next;
}

function cloneSlide(slide: Slide): Slide {
  return {
    ...slide,
    id: crypto.randomUUID(),
    elements: slide.elements.map((el) => ({
      ...el,
      id: crypto.randomUUID(),
    })),
    sim: slide.sim ? { ...slide.sim } : undefined,
  };
}

export function duplicateSlide(slideId: string): Deck | null {
  const deck = getDeck();
  if (!deck) return null;

  const index = deck.slides.findIndex((slide) => slide.id === slideId);
  if (index === -1) return null;

  const slides = [...deck.slides];
  slides.splice(index + 1, 0, cloneSlide(deck.slides[index]));

  const next = { ...deck, slides, updatedAt: Date.now() };
  saveDeck(next);
  return next;
}

export function moveSlide(slideId: string, direction: "up" | "down"): Deck | null {
  const deck = getDeck();
  if (!deck) return null;

  const index = deck.slides.findIndex((slide) => slide.id === slideId);
  if (index === -1) return null;

  const target = direction === "up" ? index - 1 : index + 1;
  if (target < 0 || target >= deck.slides.length) return deck;

  return reorderSlides(index, target);
}

export function updateSimConfig(
  slideId: string,
  sim: Partial<PatientSimConfig>,
): Deck | null {
  return updateSlide(slideId, (slide) => ({
    ...slide,
    kind: "patient-sim",
    sim: { ...(slide.sim ?? DEFAULT_PATIENT_SIM), ...sim },
  }));
}

export function nextElementZ(elements: SlideElement[]): number {
  if (elements.length === 0) return 1;
  return Math.max(...elements.map((el) => el.z)) + 1;
}

export function createNewDeck(title = "Untitled presentation"): Deck | null {
  if (!isBrowser()) return null;
  const deck = createDefaultDeck(title);
  cache = deck;
  queuePersist(deck);
  return deck;
}

export function exportDeckJson(): string | null {
  const deck = getDeck();
  if (!deck) return null;
  return JSON.stringify(deck, null, 2);
}

export function importDeckFromJson(json: string): Deck | null {
  if (!isBrowser()) return null;
  try {
    const parsed = JSON.parse(json) as Deck;
    if (!parsed.id || !Array.isArray(parsed.slides) || !parsed.title) {
      throw new Error("Invalid deck file.");
    }
    const deck: Deck = {
      ...parsed,
      id: crypto.randomUUID(),
      updatedAt: Date.now(),
      slides: parsed.slides.map((slide) => ({
        ...slide,
        id: crypto.randomUUID(),
        elements: (slide.elements ?? []).map((el) => ({
          ...el,
          id: crypto.randomUUID(),
        })),
      })),
    };
    cache = deck;
    queuePersist(deck);
    return deck;
  } catch {
    return null;
  }
}
