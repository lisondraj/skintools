"use client";

import { useState } from "react";

type Props = {
  open: boolean;
  busy: boolean;
  onClose: () => void;
  onGenerate: (prompt: string, slideCount: number) => void;
};

export function DeckGeneratorModal({ open, busy, onClose, onGenerate }: Props) {
  const [prompt, setPrompt] = useState("");
  const [slideCount, setSlideCount] = useState(6);

  if (!open) return null;

  return (
    <div className="modules-modal" role="dialog" aria-modal="true" aria-label="Generate deck">
      <div className="modules-modal__backdrop" onClick={onClose} />
      <div className="modules-modal__panel">
        <header className="modules-modal__header">
          <h2>Generate entire deck</h2>
          <button type="button" className="modules-btn modules-btn--ghost" onClick={onClose}>
            Close
          </button>
        </header>

        <p className="modules-modal__hint">
          AI creates a full presentation with varied layouts, typography, speaker notes, and
          generated clinical illustrations on image slides.
        </p>

        <label className="modules-field">
          <span className="modules-field__label">Topic</span>
          <textarea
            className="modules-field__input"
            rows={3}
            placeholder="e.g. Sun safety and skin cancer prevention for patients in Ontario"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
          />
        </label>

        <label className="modules-field">
          <span className="modules-field__label">Slides ({slideCount})</span>
          <input
            type="range"
            min={3}
            max={12}
            value={slideCount}
            onChange={(e) => setSlideCount(Number(e.target.value))}
          />
        </label>

        <button
          type="button"
          className="modules-btn modules-btn--primary modules-panel__full-btn"
          disabled={busy || !prompt.trim()}
          onClick={() => {
            onGenerate(prompt.trim(), slideCount);
            setPrompt("");
          }}
        >
          {busy ? "Generating deck & images…" : "Generate deck"}
        </button>
      </div>
    </div>
  );
}
