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
      <textarea
        id="remorph-prompt"
        className="remorph__textarea remorph__textarea--grow"
        value={prompt}
        onChange={(event) => onPromptChange(event.target.value)}
        placeholder="Describe the change, e.g. darker skin tone, keep lesion unchanged…"
        disabled={busy}
      />
      <button
        type="button"
        className="remorph__btn remorph__btn--edit"
        onClick={onSubmit}
        disabled={busy || !prompt.trim()}
      >
        {busy ? "Applying..." : "Apply edit"}
      </button>
    </section>
  );
}
