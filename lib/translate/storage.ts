import type { TranslateSession } from "@/lib/translate/types";

const STORAGE_KEY = "translate:sessions";

function isBrowser() {
  return typeof window !== "undefined";
}

export function getSessions(): TranslateSession[] {
  if (!isBrowser()) return [];

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as TranslateSession[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveSession(session: TranslateSession): void {
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
  sessions: TranslateSession[],
): Record<string, TranslateSession[]> {
  const grouped: Record<string, TranslateSession[]> = {};

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

export function collectDetectedLanguages(turns: TranslateSession["turns"]): string[] {
  const langs = new Set<string>();
  for (const turn of turns) {
    if (turn.detectedLang?.trim()) langs.add(turn.detectedLang.trim());
  }
  return [...langs];
}
