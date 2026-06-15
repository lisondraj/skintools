"use client";

import { useState } from "react";
import type { LoadingUpdate } from "@/lib/modules/loading-progress";

type Props = {
  open: boolean;
  busy: boolean;
  loading?: LoadingUpdate | null;
  onClose: () => void;
  onGenerate: (prompt: string, slideCount: number) => void;
};

export function DeckGeneratorModal({ open, busy, loading, onClose, onGenerate }: Props) {
  const [prompt, setPrompt] = useState("");
  const [slideCount, setSlideCount] = useState(6);

  if (!open) return null;

  return (
    <div className="modules-modal" role="dialog" aria-modal="true" aria-label="Generate deck">
      <div className="modules-modal__backdrop" onClick={() => !busy && onClose()} />
      <div className="modules-modal__panel">
        <header className="modules-modal__header">
          <h2>Generate entire deck</h2>
          <button
            type="button"
            className="modules-btn modules-btn--ghost"
            disabled={busy}
            onClick={onClose}
          >
            Close
          </button>
        </header>

        <p className="modules-modal__hint">
          AI creates a full presentation with varied layouts, typography, speaker notes, contextual
          GPT Image 2 backgrounds (white, solid colour, or AI-designed), and clinical illustrations.
        </p>

        {busy && loading && (
          <div className="modules-modal__progress" role="status" aria-live="polite">
            <p className="modules-modal__progress-label">{loading.label}</p>
            <div className="modules-loading-overlay__track">
              <span
                className="modules-loading-overlay__fill"
                style={{ width: `${loading.progress}%` }}
              />
            </div>
            <span className="modules-modal__progress-pct">{loading.progress}%</span>
          </div>
        )}

        <label className="modules-field">
          <span className="modules-field__label">Topic</span>
          <textarea
            className="modules-field__input"
            rows={3}
            placeholder="e.g. Sun safety and skin cancer prevention for patients in Ontario"
            value={prompt}
            disabled={busy}
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
            disabled={busy}
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
          {busy ? (loading?.label ?? "Generating deck…") : "Generate deck"}
        </button>
      </div>
    </div>
  );
}
