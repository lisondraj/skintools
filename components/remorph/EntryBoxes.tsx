"use client";

import { REMORPH_DRAG_MIME, type RemorphDragStep } from "@/lib/remorph/types";

type EntryBoxesProps = {
  onUploadClick: () => void;
  onPromptClick: () => void;
  onHistoryDrop: (payload: RemorphDragStep) => void;
  busy?: boolean;
  historyDropActive?: boolean;
};

export function EntryBoxes({
  onUploadClick,
  onPromptClick,
  onHistoryDrop,
  busy = false,
  historyDropActive = false,
}: EntryBoxesProps) {
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

      <button
        type="button"
        className="remorph-entry__box"
        onClick={onPromptClick}
        disabled={busy}
      >
        <span className="remorph-entry__icon" aria-hidden>
          ✦
        </span>
        <span className="remorph-entry__label">Prompt image</span>
      </button>

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
