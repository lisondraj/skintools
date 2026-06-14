"use client";

type PromptBarProps = {
  mode: "generate" | "edit";
  prompt: string;
  onPromptChange: (value: string) => void;
  onSubmit: () => void;
  busy?: boolean;
  onClearSelection: () => void;
  hasImage: boolean;
  hasSelection: boolean;
  hoverLabel: string | null;
  segmentReady: boolean;
};

export function PromptBar({
  mode,
  prompt,
  onPromptChange,
  onSubmit,
  busy = false,
  onClearSelection,
  hasImage,
  hasSelection,
  hoverLabel,
  segmentReady,
}: PromptBarProps) {
  const isGenerate = mode === "generate";

  return (
    <>
      {hasImage && (
        <section className="remorph__section">
          <h2 className="remorph__section-title">Feature select</h2>
          <p className="remorph__hint">
            Hover a feature to highlight all regions of the same type; click to
            select. Click another type to add. Unselected areas stay identical.
          </p>
          {hoverLabel ? (
            <p className="remorph__category-label">Hovering: {hoverLabel}</p>
          ) : null}
          <p
            className={`remorph__selection-status${
              hasSelection ? " is-active" : ""
            }`}
          >
            {!segmentReady
              ? "Analyzing features…"
              : hasSelection
                ? "Region selected — edit will apply only to the highlight."
                : "No region selected — edit will apply to the whole image."}
          </p>
          <div className="remorph__btn-row" style={{ marginTop: 12 }}>
            <button
              type="button"
              className="remorph__btn remorph__btn--secondary"
              onClick={onClearSelection}
              disabled={busy || !hasSelection}
            >
              Clear selection
            </button>
          </div>
        </section>
      )}

      <section className="remorph__section">
        <h2 className="remorph__section-title">
          {isGenerate ? "Generate" : "Edit"}
        </h2>
        <p className="remorph__hint">
          {isGenerate
            ? "Describe the up-close skin lesion photo to generate."
            : "Describe how the selected feature should change. Example: make the pimple larger, keep the skin unchanged."}
        </p>
        <label className="remorph__label" htmlFor="remorph-prompt">
          Prompt
        </label>
        <textarea
          id="remorph-prompt"
          className="remorph__textarea"
          value={prompt}
          onChange={(event) => onPromptChange(event.target.value)}
          placeholder={
            isGenerate
              ? "Small brown macule on fair skin, clinical close-up..."
              : "Make the pimple slightly larger and more inflamed..."
          }
          disabled={busy}
        />
        <button
          type="button"
          className="remorph__btn"
          style={{ marginTop: 12 }}
          onClick={onSubmit}
          disabled={busy || !prompt.trim() || (hasImage && !segmentReady)}
        >
          {busy ? "Working..." : isGenerate ? "Generate image" : "Apply edit"}
        </button>
      </section>
    </>
  );
}
