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
} from "@/lib/vsp/storage";
import type { VspSession } from "@/lib/vsp/types";

function RecentSession({ session }: { session: VspSession }) {
  const turnCount = session.transcript.length;

  return (
    <Link href="/vsp/history" className="vsp-preview-card">
      <span className="vsp-preview-card__persona">{session.config.persona}</span>
      <span className="vsp-preview-card__meta">
        {formatSessionTime(session.createdAt)} · {formatDuration(session.durationSec)} ·{" "}
        {turnCount} turn{turnCount === 1 ? "" : "s"}
      </span>
    </Link>
  );
}

export default function VspLandingPage() {
  const [sessions, setSessions] = useState<VspSession[]>([]);

  useEffect(() => {
    setSessions(getSessions());
  }, []);

  const grouped = groupSessionsByDate(sessions);
  const dateKeys = sortDateKeys(Object.keys(grouped));
  const recentKeys = dateKeys.slice(0, 3);

  return (
    <div className="vsp-tool__inner">
      <header className="vsp-tool__header">
        <Link href="/vsp" className="vsp-tool__logo">
          Virtual Patient
        </Link>
      </header>

      <main className="vsp-tool__section">
        <h1 className="vsp-tool__title">Practice the encounter.</h1>
        <p className="vsp-tool__lead">
          Run a voice consultation with a virtual patient. Push-to-talk, review the
          transcript when you finish, and revisit past sessions in your history.
        </p>

        <Link href="/vsp/session" className="vsp-tool__btn">
          Start session
        </Link>

        {recentKeys.length > 0 && (
          <div className="vsp-preview">
            <p className="vsp-preview__heading">Recent</p>
            {recentKeys.map((dateKey) => (
              <div key={dateKey} className="vsp-preview__group">
                <p className="vsp-preview__date">{formatDisplayDate(dateKey)}</p>
                <div className="vsp-preview__cards">
                  {grouped[dateKey].map((session) => (
                    <RecentSession key={session.id} session={session} />
                  ))}
                </div>
              </div>
            ))}
            <Link href="/vsp/history" className="vsp-tool__link">
              View all history
            </Link>
          </div>
        )}

        <p className="vsp-tool__disclaimer">
          For professional training only. Virtual Patient does not provide medical advice
          or replace supervised clinical practice.
        </p>
      </main>
    </div>
  );
}
