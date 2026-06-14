"use client";

type PromptBarProps = {
  mode: "generate" | "edit";
  prompt: string;
  onPromptChange: (value: string) => void;
  onSubmit: () => void;
  busy?: boolean;
  tolerance: number;
  onToleranceChange: (value: number) => void;
  onClearSelection: () => void;
  hasImage: boolean;
  hasSelection: boolean;
};

export function PromptBar({
  mode,
  prompt,
  onPromptChange,
  onSubmit,
  busy = false,
  tolerance,
  onToleranceChange,
  onClearSelection,
  hasImage,
  hasSelection,
}: PromptBarProps) {
  const isGenerate = mode === "generate";

  return (
    <>
      {hasImage && (
        <section className="remorph__section">
          <h2 className="remorph__section-title">Feature select</h2>
          <p className="remorph__hint">
            Hover a feature to highlight everything like it; click to select.
            Click more features to add. Unselected areas stay identical.
          </p>
          <label className="remorph__label" htmlFor="tolerance">
            Similarity ({tolerance})
          </label>
          <input
            id="tolerance"
            className="remorph__range"
            type="range"
            min={0}
            max={100}
            value={tolerance}
            onChange={(event) => onToleranceChange(Number(event.target.value))}
            disabled={busy}
          />
          <p
            className={`remorph__selection-status${
              hasSelection ? " is-active" : ""
            }`}
          >
            {hasSelection
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
          disabled={busy || !prompt.trim()}
        >
          {busy ? "Working..." : isGenerate ? "Generate image" : "Apply edit"}
        </button>
      </section>
    </>
  );
}
