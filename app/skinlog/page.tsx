"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  formatDisplayDate,
  getEntries,
  groupEntriesByDate,
  sortDateKeys,
} from "@/lib/skinlog/storage";
import type { ScanEntry } from "@/lib/skinlog/types";

function RecentEntry({ entry }: { entry: ScanEntry }) {
  const photo =
    entry.lesions.length > 0 ? entry.lesions[0].photo : null;

  return (
    <Link href="/skinlog/history" className="skinlog-preview-card">
      {photo && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photo} alt="" className="skinlog-preview-card__thumb" />
      )}
      <div className="skinlog-preview-card__info">
        <span className="skinlog-preview-card__mode">
          {entry.mode === "single" ? "Single lesion" : "Full body"}
        </span>
        <span className="skinlog-preview-card__count">
          {entry.lesions.length} finding{entry.lesions.length === 1 ? "" : "s"}
        </span>
      </div>
    </Link>
  );
}

export default function SkinArchiveLandingPage() {
  const [entries, setEntries] = useState<ScanEntry[]>([]);

  useEffect(() => {
    setEntries(getEntries());
  }, []);

  const grouped = groupEntriesByDate(entries);
  const dateKeys = sortDateKeys(Object.keys(grouped));
  const recentKeys = dateKeys.slice(0, 3);

  return (
    <div className="skinlog__inner">
      <header className="skinlog__header">
        <Link href="/skinlog" className="skinlog__logo">
          Skin Archive
        </Link>
      </header>

      <main className="skinlog__section">
        <h1 className="skinlog__title">Track changes over time.</h1>
        <p className="skinlog__lead">
          Photograph skin lesions or run a guided full-body scan. Descriptions
          are saved by date so you can review your history with your care team.
        </p>

        <Link href="/skinlog/capture" className="skinlog__btn">
          Get started
        </Link>

        {recentKeys.length > 0 && (
          <div className="skinlog-preview">
            <p className="skinlog-preview__heading">Recent</p>
            {recentKeys.map((dateKey) => (
              <div key={dateKey} className="skinlog-preview__group">
                <p className="skinlog-preview__date">
                  {formatDisplayDate(dateKey)}
                </p>
                <div className="skinlog-preview__cards">
                  {grouped[dateKey].map((entry) => (
                    <RecentEntry key={entry.id} entry={entry} />
                  ))}
                </div>
              </div>
            ))}
            <Link href="/skinlog/history" className="skinlog__link">
              View all history
            </Link>
          </div>
        )}

        <p className="skinlog__disclaimer">
          For personal tracking only. Skin Archive does not provide a medical
          diagnosis.
        </p>
      </main>
    </div>
  );
}
