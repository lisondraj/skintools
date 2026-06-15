"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Conversation } from "@/components/translate/Conversation";
import {
  collectDetectedLanguages,
  deleteSession,
  formatDisplayDate,
  formatDuration,
  formatSessionTime,
  getSessions,
  groupSessionsByDate,
  sortDateKeys,
} from "@/lib/translate/storage";
import type { TranslateSession } from "@/lib/translate/types";

export default function TranslateHistoryPage() {
  const [sessions, setSessions] = useState<TranslateSession[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    setSessions(getSessions());
  }, []);

  const grouped = groupSessionsByDate(sessions);
  const dateKeys = sortDateKeys(Object.keys(grouped));

  function handleDelete(id: string) {
    deleteSession(id);
    setSessions(getSessions());
    if (expandedId === id) setExpandedId(null);
  }

  function toggleExpanded(id: string) {
    setExpandedId((current) => (current === id ? null : id));
  }

  return (
    <div className="translate-tool__inner">
      <header className="translate-tool__header">
        <Link href="/translate" className="translate-tool__logo">
          Live Translate
        </Link>
      </header>

      <main className="translate-tool__section">
        <h1 className="translate-tool__title translate-tool__title--sm">History</h1>
        <p className="translate-tool__lead translate-tool__lead--tight">
          Past translation sessions with full transcripts.
        </p>

        {dateKeys.length === 0 ? (
          <div className="tr-history-empty">
            <p>No sessions yet.</p>
            <Link href="/translate/session" className="translate-tool__link">
              Start a session
            </Link>
          </div>
        ) : (
          dateKeys.map((dateKey) => (
            <section key={dateKey} style={{ marginBottom: 32 }}>
              <h2 className="tr-history-date">{formatDisplayDate(dateKey)}</h2>

              {grouped[dateKey].map((session) => {
                const expanded = expandedId === session.id;
                const turnCount = session.turns.length;
                const detected = collectDetectedLanguages(session.turns);

                return (
                  <article key={session.id} className="tr-history-entry">
                    <div className="tr-history-entry__head">
                      <div className="tr-history-entry__info">
                        <p className="tr-history-entry__title">
                          → {session.config.targetLangLabel}
                        </p>
                        <p className="tr-history-entry__meta">
                          {formatSessionTime(session.createdAt)} ·{" "}
                          {formatDuration(session.durationSec)} · {turnCount} turn
                          {turnCount === 1 ? "" : "s"}
                          {detected.length > 0 && ` · ${detected.join(", ")}`}
                        </p>
                      </div>
                      <div className="tr-history-entry__actions">
                        <button
                          type="button"
                          className="tr-history-entry__toggle"
                          onClick={() => toggleExpanded(session.id)}
                        >
                          {expanded ? "Hide" : "Transcript"}
                        </button>
                        <button
                          type="button"
                          className="tr-history-entry__delete"
                          onClick={() => handleDelete(session.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </div>

                    {expanded && (
                      <div className="tr-history-entry__body">
                        <Conversation
                          turns={session.turns}
                          speakerLabel={session.config.speakerLabel}
                          emptyLabel="No transcript recorded."
                        />
                      </div>
                    )}
                  </article>
                );
              })}
            </section>
          ))
        )}

        <Link href="/translate/session" className="translate-tool__btn" style={{ marginTop: 8 }}>
          New session
        </Link>
      </main>
    </div>
  );
}
