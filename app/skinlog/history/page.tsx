"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { LesionBlock } from "@/components/skinlog/LesionBlock";
import {
  deleteEntry,
  formatDisplayDate,
  getEntries,
  groupEntriesByDate,
  sortDateKeys,
} from "@/lib/skinlog/storage";
import type { ScanEntry } from "@/lib/skinlog/types";

export default function SkinLogHistoryPage() {
  const [entries, setEntries] = useState<ScanEntry[]>([]);

  useEffect(() => {
    setEntries(getEntries());
  }, []);

  const grouped = groupEntriesByDate(entries);
  const dateKeys = sortDateKeys(Object.keys(grouped));

  function handleDelete(id: string) {
    deleteEntry(id);
    setEntries(getEntries());
  }

  return (
    <div className="skinlog__inner">
      <header className="skinlog__header">
        <Link href="/skinlog" className="skinlog__logo">
          SkinLog
        </Link>
      </header>

      <main className="skinlog__section">
        <h1 className="skinlog__title" style={{ fontSize: 22, marginBottom: 8 }}>
          History
        </h1>
        <p className="skinlog__lead" style={{ marginBottom: 24 }}>
          Lesion logs organized by date.
        </p>

        {dateKeys.length === 0 ? (
          <div className="skinlog-history-empty">
            <p>No entries yet.</p>
            <Link href="/skinlog/capture" className="skinlog__link">
              Start a scan
            </Link>
          </div>
        ) : (
          dateKeys.map((dateKey) => (
            <section key={dateKey} style={{ marginBottom: 32 }}>
              <h2 className="skinlog-history-date">
                {formatDisplayDate(dateKey)}
              </h2>

              {grouped[dateKey].map((entry) => (
                <div key={entry.id} className="skinlog-history-entry">
                  <div className="skinlog-history-entry__meta">
                    <span className="skinlog-history-entry__mode">
                      {entry.mode === "single" ? "Single lesion" : "Full body"}
                    </span>
                    <button
                      type="button"
                      className="skinlog-history-entry__delete"
                      onClick={() => handleDelete(entry.id)}
                    >
                      Delete
                    </button>
                  </div>

                  {entry.lesions.map((lesion) => (
                    <LesionBlock key={lesion.id} lesion={lesion} compact />
                  ))}
                </div>
              ))}
            </section>
          ))
        )}

        <Link href="/skinlog/capture" className="skinlog__btn" style={{ marginTop: 8 }}>
          New scan
        </Link>
      </main>
    </div>
  );
}
