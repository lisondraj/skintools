"use client";

import { useEffect, useRef } from "react";
import { REMORPH_DRAG_MIME, type RemorphDragStep } from "@/lib/remorph/types";

type EntryBoxesProps = {
  onUploadClick: () => void;
  promptOpen: boolean;
  onPromptOpen: () => void;
  prompt: string;
  onPromptChange: (value: string) => void;
  onPromptSubmit: () => void;
  onHistoryDrop: (payload: RemorphDragStep) => void;
  busy?: boolean;
  historyDropActive?: boolean;
};

export function EntryBoxes({
  onUploadClick,
  promptOpen,
  onPromptOpen,
  prompt,
  onPromptChange,
  onPromptSubmit,
  onHistoryDrop,
  busy = false,
  historyDropActive = false,
}: EntryBoxesProps) {
  const promptRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (promptOpen) {
      promptRef.current?.focus();
    }
  }, [promptOpen]);

  const handleHistoryDragOver = (event: React.DragEvent) => {
    if (!event.dataTransfer.types.includes(REMORPH_DRAG_MIME)) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  };

  const handleHistoryDrop = (event: React.DragEvent) => {
    event.preventDefault();
    const raw = event.dataTransfer.getData(REMORPH_DRAG_MIME);
    if (!raw) return;

    try {
      onHistoryDrop(JSON.parse(raw) as RemorphDragStep);
    } catch {
      /* ignore invalid payload */
    }
  };

  return (
    <div className="remorph-entry">
      <button
        type="button"
        className="remorph-entry__box"
        onClick={onUploadClick}
        disabled={busy}
      >
        <span className="remorph-entry__icon" aria-hidden>
          ↑
        </span>
        <span className="remorph-entry__label">Upload image</span>
      </button>

      <div
        className={`remorph-entry__box remorph-entry__box--prompt ${promptOpen ? "is-open" : ""}`}
      >
        {promptOpen ? (
          <div className="remorph-entry__prompt-shell">
            <textarea
              ref={promptRef}
              id="remorph-entry-prompt"
              className="remorph-entry__prompt-input"
              value={prompt}
              onChange={(event) => onPromptChange(event.target.value)}
              placeholder="Describe a close-up skin lesion photo..."
              disabled={busy}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  onPromptSubmit();
                }
              }}
            />
            <span className="remorph-entry__prompt-hint">Enter to generate</span>
            <button
              type="button"
              className="remorph-entry__prompt-submit"
              aria-label="Generate image"
              onClick={onPromptSubmit}
              disabled={busy || !prompt.trim()}
            >
              →
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="remorph-entry__box-trigger"
            onClick={onPromptOpen}
            disabled={busy}
          >
            <span className="remorph-entry__icon" aria-hidden>
              ✦
            </span>
            <span className="remorph-entry__label">Prompt image</span>
          </button>
        )}
      </div>

      <div
        className={`remorph-entry__box remorph-entry__box--drop ${historyDropActive ? "is-active" : ""}`}
        onDragOver={handleHistoryDragOver}
        onDrop={handleHistoryDrop}
        role="region"
        aria-label="Drag from history below"
      >
        <span className="remorph-entry__icon" aria-hidden>
          ⇲
        </span>
        <span className="remorph-entry__label">Drag from history below</span>
      </div>
    </div>
  );
}
