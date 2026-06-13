import type { ScanEntry } from "@/lib/skinlog/types";

const STORAGE_KEY = "skinlog:entries";

function isBrowser() {
  return typeof window !== "undefined";
}

export function getEntries(): ScanEntry[] {
  if (!isBrowser()) return [];

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ScanEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveEntry(entry: ScanEntry): void {
  if (!isBrowser()) return;
  const entries = getEntries();
  entries.unshift(entry);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

export function deleteEntry(id: string): void {
  if (!isBrowser()) return;
  const entries = getEntries().filter((entry) => entry.id !== id);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

export function formatDateKey(date: Date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

export function groupEntriesByDate(
  entries: ScanEntry[],
): Record<string, ScanEntry[]> {
  const grouped: Record<string, ScanEntry[]> = {};

  for (const entry of entries) {
    if (!grouped[entry.date]) grouped[entry.date] = [];
    grouped[entry.date].push(entry);
  }

  return grouped;
}

export function sortDateKeys(keys: string[]): string[] {
  return [...keys].sort((a, b) => b.localeCompare(a));
}

export function formatDisplayDate(dateKey: string): string {
  const date = new Date(`${dateKey}T12:00:00`);
  return date.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}
