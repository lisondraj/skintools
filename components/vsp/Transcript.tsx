"use client";

import { useEffect, useRef } from "react";
import type { VspTurn } from "@/lib/vsp/types";

type Props = {
  turns: VspTurn[];
  live?: boolean;
  emptyLabel?: string;
};

export function Transcript({ turns, live = false, emptyLabel = "Transcript will appear here." }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!live) return;
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [turns, live]);

  if (turns.length === 0) {
    return (
      <div className={`vsp-transcript${live ? " vsp-transcript--live" : ""}`}>
        <p className="vsp-transcript__empty">{emptyLabel}</p>
      </div>
    );
  }

  return (
    <div className={`vsp-transcript${live ? " vsp-transcript--live" : ""}`}>
      {turns.map((turn, index) => (
        <div
          key={`${turn.at}-${index}`}
          className={`vsp-transcript__turn vsp-transcript__turn--${turn.role}`}
        >
          <span className="vsp-transcript__role">
            {turn.role === "clinician" ? "You" : "Patient"}
          </span>
          <p className="vsp-transcript__text">{turn.text}</p>
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  );
}

export function appendTranscriptTurn(
  turns: VspTurn[],
  role: VspTurn["role"],
  text: string,
  at: number,
): VspTurn[] {
  const trimmed = text.trim();
  if (!trimmed) return turns;

  const last = turns[turns.length - 1];
  if (last && last.role === role) {
    if (last.text === trimmed) return turns;
    if (trimmed.startsWith(last.text) || last.text.startsWith(trimmed)) {
      return [...turns.slice(0, -1), { role, text: trimmed, at }];
    }
  }

  return [...turns, { role, text: trimmed, at }];
}
