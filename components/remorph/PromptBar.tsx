"use client";

type PromptBarProps = {
  prompt: string;
  onPromptChange: (value: string) => void;
  onSubmit: () => void;
  busy?: boolean;
};

export function PromptBar({
  prompt,
  onPromptChange,
  onSubmit,
  busy = false,
}: PromptBarProps) {
  return (
    <section className="remorph__section remorph__section--edit">
      <h2 className="remorph__section-title">Edit</h2>
      <p className="remorph__hint">
        Describe how the image should change. Example: darker skin tone, keep
        lesion color unchanged.
      </p>
      <label className="remorph__label" htmlFor="remorph-prompt">
        Prompt
      </label>
      <textarea
        id="remorph-prompt"
        className="remorph__textarea remorph__textarea--grow"
        value={prompt}
        onChange={(event) => onPromptChange(event.target.value)}
        placeholder="Show on a darker skin phenotype, preserve the lesion..."
        disabled={busy}
      />
      <button
        type="button"
        className="remorph__btn"
        style={{ marginTop: 12 }}
        onClick={onSubmit}
        disabled={busy || !prompt.trim()}
      >
        {busy ? "Working..." : "Apply edit"}
      </button>
    </section>
  );
}
