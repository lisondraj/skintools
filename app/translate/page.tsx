"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  formatDisplayDate,
  formatDuration,
  formatSessionTime,
  getSessions,
  groupSessionsByDate,
  sortDateKeys,
} from "@/lib/translate/storage";
import type { TranslateSession } from "@/lib/translate/types";

function RecentSession({ session }: { session: TranslateSession }) {
  const turnCount = session.turns.length;

  return (
    <Link href="/translate/history" className="tr-preview-card">
      <span className="tr-preview-card__title">
        → {session.config.targetLangLabel}
      </span>
      <span className="tr-preview-card__meta">
        {formatSessionTime(session.createdAt)} · {formatDuration(session.durationSec)} ·{" "}
        {turnCount} turn{turnCount === 1 ? "" : "s"}
      </span>
    </Link>
  );
}

export default function TranslateLandingPage() {
  const [sessions, setSessions] = useState<TranslateSession[]>([]);

  useEffect(() => {
    setSessions(getSessions());
  }, []);

  const grouped = groupSessionsByDate(sessions);
  const dateKeys = sortDateKeys(Object.keys(grouped));
  const recentKeys = dateKeys.slice(0, 3);

  return (
    <div className="translate-tool__inner">
      <header className="translate-tool__header">
        <Link href="/translate" className="translate-tool__logo">
          Live Translate
        </Link>
      </header>

      <main className="translate-tool__section">
        <h1 className="translate-tool__title">Hear it. Read it. Translate it.</h1>
        <p className="translate-tool__lead">
          Start a session and speak naturally. Live captions appear on screen,
          translated into your chosen language — saved to history when you finish.
        </p>

        <Link href="/translate/session" className="translate-tool__btn">
          Start session
        </Link>

        {recentKeys.length > 0 && (
          <div className="tr-preview">
            <p className="tr-preview__heading">Recent</p>
            {recentKeys.map((dateKey) => (
              <div key={dateKey} className="tr-preview__group">
                <p className="tr-preview__date">{formatDisplayDate(dateKey)}</p>
                <div className="tr-preview__cards">
                  {grouped[dateKey].map((session) => (
                    <RecentSession key={session.id} session={session} />
                  ))}
                </div>
              </div>
            ))}
            <Link href="/translate/history" className="translate-tool__link">
              View all history
            </Link>
          </div>
        )}

        <p className="translate-tool__disclaimer">
          Uses browser speech recognition (Chrome, Edge, or Safari) and OpenAI for
          translation. For personal use — not a certified interpreter.
        </p>
      </main>
    </div>
  );
}
