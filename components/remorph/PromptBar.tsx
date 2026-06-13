"use client";

type PromptBarProps = {
  mode: "generate" | "edit";
  prompt: string;
  onPromptChange: (value: string) => void;
  onSubmit: () => void;
  busy?: boolean;
  brushSize: number;
  onBrushSizeChange: (value: number) => void;
  brushMode: "paint" | "erase";
  onBrushModeChange: (mode: "paint" | "erase") => void;
  onClearMask: () => void;
  hasImage: boolean;
};

export function PromptBar({
  mode,
  prompt,
  onPromptChange,
  onSubmit,
  busy = false,
  brushSize,
  onBrushSizeChange,
  brushMode,
  onBrushModeChange,
  onClearMask,
  hasImage,
}: PromptBarProps) {
  const isGenerate = mode === "generate";

  return (
    <>
      {hasImage && (
        <section className="remorph__section">
          <h2 className="remorph__section-title">Brush mask</h2>
          <p className="remorph__hint">
            Paint the region you want to change. Unpainted areas stay identical.
            Leave the mask empty to edit the whole image.
          </p>
          <div className="remorph__tool-row">
            <button
              type="button"
              className={`remorph__tool-btn ${brushMode === "paint" ? "is-active" : ""}`}
              onClick={() => onBrushModeChange("paint")}
              disabled={busy}
            >
              Paint
            </button>
            <button
              type="button"
              className={`remorph__tool-btn ${brushMode === "erase" ? "is-active" : ""}`}
              onClick={() => onBrushModeChange("erase")}
              disabled={busy}
            >
              Erase
            </button>
          </div>
          <label className="remorph__label" htmlFor="brush-size">
            Brush size ({brushSize}px)
          </label>
          <input
            id="brush-size"
            className="remorph__range"
            type="range"
            min={8}
            max={120}
            value={brushSize}
            onChange={(event) => onBrushSizeChange(Number(event.target.value))}
            disabled={busy}
          />
          <div className="remorph__btn-row" style={{ marginTop: 12 }}>
            <button
              type="button"
              className="remorph__btn remorph__btn--secondary"
              onClick={onClearMask}
              disabled={busy}
            >
              Clear mask
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
            : "Describe how the painted region should change. Example: darker skin tone, keep lesion color unchanged."}
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
              : "Show on a darker skin phenotype, preserve the lesion..."
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
