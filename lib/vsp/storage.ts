import type { VspSession } from "@/lib/vsp/types";

const STORAGE_KEY = "vsp:sessions";

function isBrowser() {
  return typeof window !== "undefined";
}

export function getSessions(): VspSession[] {
  if (!isBrowser()) return [];

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as VspSession[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveSession(session: VspSession): void {
  if (!isBrowser()) return;
  const sessions = getSessions();
  sessions.unshift(session);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
}

export function deleteSession(id: string): void {
  if (!isBrowser()) return;
  const sessions = getSessions().filter((session) => session.id !== id);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
}

export function formatDateKey(timestamp: number): string {
  return new Date(timestamp).toISOString().slice(0, 10);
}

export function groupSessionsByDate(
  sessions: VspSession[],
): Record<string, VspSession[]> {
  const grouped: Record<string, VspSession[]> = {};

  for (const session of sessions) {
    const dateKey = formatDateKey(session.createdAt);
    if (!grouped[dateKey]) grouped[dateKey] = [];
    grouped[dateKey].push(session);
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

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s}s`;
  return `${m}m ${s}s`;
}

export function formatSessionTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}
