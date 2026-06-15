"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Transcript } from "@/components/vsp/Transcript";
import {
  deleteSession,
  formatDisplayDate,
  formatDuration,
  formatSessionTime,
  getSessions,
  groupSessionsByDate,
  sortDateKeys,
} from "@/lib/vsp/storage";
import type { VspSession } from "@/lib/vsp/types";

export default function VspHistoryPage() {
  const [sessions, setSessions] = useState<VspSession[]>([]);
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
    <div className="vsp-tool__inner">
      <header className="vsp-tool__header">
        <Link href="/vsp" className="vsp-tool__logo">
          Virtual Patient
        </Link>
      </header>

      <main className="vsp-tool__section">
        <h1 className="vsp-tool__title vsp-tool__title--sm">History</h1>
        <p className="vsp-tool__lead vsp-tool__lead--tight">
          Past encounters with full transcripts.
        </p>

        {dateKeys.length === 0 ? (
          <div className="vsp-history-empty">
            <p>No sessions yet.</p>
            <Link href="/vsp/session" className="vsp-tool__link">
              Start a session
            </Link>
          </div>
        ) : (
          dateKeys.map((dateKey) => (
            <section key={dateKey} style={{ marginBottom: 32 }}>
              <h2 className="vsp-history-date">{formatDisplayDate(dateKey)}</h2>

              {grouped[dateKey].map((session) => {
                const expanded = expandedId === session.id;
                const turnCount = session.transcript.length;

                return (
                  <article key={session.id} className="vsp-history-entry">
                    <div className="vsp-history-entry__head">
                      <div className="vsp-history-entry__info">
                        <p className="vsp-history-entry__persona">{session.config.persona}</p>
                        <p className="vsp-history-entry__meta">
                          {formatSessionTime(session.createdAt)} ·{" "}
                          {formatDuration(session.durationSec)} · {turnCount} turn
                          {turnCount === 1 ? "" : "s"} · {session.config.difficulty}
                        </p>
                      </div>
                      <div className="vsp-history-entry__actions">
                        <button
                          type="button"
                          className="vsp-history-entry__toggle"
                          onClick={() => toggleExpanded(session.id)}
                        >
                          {expanded ? "Hide" : "Transcript"}
                        </button>
                        <button
                          type="button"
                          className="vsp-history-entry__delete"
                          onClick={() => handleDelete(session.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </div>

                    {expanded && (
                      <div className="vsp-history-entry__body">
                        <p className="vsp-form__hint" style={{ marginBottom: 12 }}>
                          {session.config.scenario}
                        </p>
                        <Transcript
                          turns={session.transcript}
                          emptyLabel="No transcript recorded for this session."
                        />
                      </div>
                    )}
                  </article>
                );
              })}
            </section>
          ))
        )}

        <Link href="/vsp/session" className="vsp-tool__btn" style={{ marginTop: 8 }}>
          New session
        </Link>
      </main>
    </div>
  );
}
