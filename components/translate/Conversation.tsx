"use client";

import { useEffect, useRef } from "react";
import type { TranslateTurn } from "@/lib/translate/types";

type Props = {
  turns: TranslateTurn[];
  live?: boolean;
  showOriginal?: boolean;
  emptyLabel?: string;
  speakerLabel?: string;
};

function roleLabel(role: TranslateTurn["role"], speakerLabel?: string): string {
  if (role === "you") return "You";
  return speakerLabel?.trim() || "Speaker";
}

export function Conversation({
  turns,
  live = false,
  showOriginal = true,
  emptyLabel = "Translation will appear here.",
  speakerLabel,
}: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!live) return;
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [turns, live]);

  if (turns.length === 0) {
    return (
      <div className={`tr-convo${live ? " tr-convo--live" : ""}`}>
        <p className="tr-convo__empty">{emptyLabel}</p>
      </div>
    );
  }

  return (
    <div className={`tr-convo${live ? " tr-convo--live" : ""}`}>
      {turns.map((turn, index) => (
        <article
          key={`${turn.at}-${index}`}
          className={`tr-convo__turn tr-convo__turn--${turn.role}`}
        >
          <span className="tr-convo__role">{roleLabel(turn.role, speakerLabel).toUpperCase()}</span>
          <p className="tr-convo__text">{turn.translated || turn.original}</p>
          {showOriginal && turn.original !== turn.translated && (
            <p className="tr-convo__text tr-convo__text--original">{turn.original}</p>
          )}
          {turn.detectedLang && (
            <p className="tr-convo__lang">{turn.detectedLang}</p>
          )}
        </article>
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
