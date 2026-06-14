"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AnnotatedPhoto } from "@/components/skinlog/AnnotatedPhoto";
import { FindingList } from "@/components/skinlog/FindingList";
import { groupLesionsByPhoto } from "@/lib/skinlog/lesions";
import {
  deleteEntry,
  formatDisplayDate,
  getEntries,
  groupEntriesByDate,
  sortDateKeys,
} from "@/lib/skinlog/storage";
import type { ScanEntry } from "@/lib/skinlog/types";

function HistoryEntryBody({ entry }: { entry: ScanEntry }) {
  if (entry.lesions.length === 0) {
    return (
      <p className="skinlog-history-entry__empty">No findings recorded.</p>
    );
  }

  if (entry.mode === "single") {
    return (
      <>
        <AnnotatedPhoto
          photo={entry.lesions[0].photo}
          lesions={entry.lesions}
        />
        <FindingList lesions={entry.lesions} />
      </>
    );
  }

  return (
    <>
      {groupLesionsByPhoto(entry.lesions).map((group) => (
        <div key={group[0].photo} className="skinlog-history-photo-group">
          <AnnotatedPhoto photo={group[0].photo} lesions={group} />
          <FindingList lesions={group} />
        </div>
      ))}
    </>
  );
}

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
                    <span className="skinlog-history-entry__count">
                      {entry.lesions.length} finding
                      {entry.lesions.length === 1 ? "" : "s"}
                    </span>
                    <button
                      type="button"
                      className="skinlog-history-entry__delete"
                      onClick={() => handleDelete(entry.id)}
                    >
                      Delete
                    </button>
                  </div>

                  <HistoryEntryBody entry={entry} />
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
