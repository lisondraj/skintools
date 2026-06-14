import type { RemorphAlbum, RemorphAlbumStep } from "@/lib/remorph/types";

const STORAGE_KEY = "remorph:albums";

function isBrowser() {
  return typeof window !== "undefined";
}

export function getAlbums(): RemorphAlbum[] {
  if (!isBrowser()) return [];

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as RemorphAlbum[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAlbums(albums: RemorphAlbum[]): void {
  if (!isBrowser()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(albums));
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
  writeAlbums(albums);
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
  saveAlbum(album);
  return album;
}

export function updateAlbumTitle(albumId: string, title: string): void {
  const albums = getAlbums();
  const album = albums.find((entry) => entry.id === albumId);
  if (!album) return;
  album.title = title.trim() || album.title;
  saveAlbum(album);
}

export function deleteAlbum(albumId: string): void {
  if (!isBrowser()) return;
  writeAlbums(getAlbums().filter((entry) => entry.id !== albumId));
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
