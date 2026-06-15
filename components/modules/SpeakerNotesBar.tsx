"use client";

type Props = {
  notes: string;
  open: boolean;
  busy: boolean;
  canGenerate: boolean;
  onToggle: () => void;
  onUpdateNotes: (notes: string) => void;
  onGenerateNotes: () => void;
};

export function SpeakerNotesBar({
  notes,
  open,
  busy,
  canGenerate,
  onToggle,
  onUpdateNotes,
  onGenerateNotes,
}: Props) {
  const hasNotes = Boolean(notes.trim());

  return (
    <div className="modules__notes-section">
      <button
        type="button"
        className={`modules__notes-toggle${open ? " is-open" : ""}`}
        onClick={onToggle}
        aria-expanded={open}
        aria-controls="modules-speaker-notes"
      >
        <span className="modules__notes-toggle-label">Speaker notes</span>
        {hasNotes && !open && (
          <span className="modules__notes-toggle-hint">Has notes</span>
        )}
        <span className="modules__notes-toggle-action">{open ? "Hide" : "Show"}</span>
      </button>

      {open && (
        <div id="modules-speaker-notes" className="modules__notes-panel">
          <textarea
            className="modules__notes-input"
            rows={4}
            placeholder="Notes for the presenter — not shown on the slide…"
            value={notes}
            onChange={(e) => onUpdateNotes(e.target.value)}
          />
          {canGenerate && (
            <button
              type="button"
              className="modules-btn modules-btn--secondary modules__notes-generate"
              disabled={busy}
              onClick={onGenerateNotes}
            >
              {busy ? "Working…" : "AI generate notes"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
