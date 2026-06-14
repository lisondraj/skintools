"use client";

import type { AutofillMode } from "@/lib/modules/types";

type Props = {
  onAddText: () => void;
  onAddImage: () => void;
  onPresent: () => void;
  onAutofill: (mode: AutofillMode, prompt?: string) => void;
  autofillBusy: boolean;
  hasSelection: boolean;
  selectedIsText: boolean;
};

export function Toolbar({
  onAddText,
  onAddImage,
  onPresent,
  onAutofill,
  autofillBusy,
  hasSelection,
  selectedIsText,
}: Props) {
  return (
    <aside className="modules-toolbar">
      <h2 className="modules-toolbar__title">Tools</h2>

      <div className="modules-toolbar__group">
        <button type="button" className="modules-btn" onClick={onAddText}>
          Add text
        </button>
        <button type="button" className="modules-btn modules-btn--secondary" onClick={onAddImage}>
          Add image
        </button>
      </div>

      <div className="modules-toolbar__group">
        <span className="modules-toolbar__label">AI fill</span>
        <button
          type="button"
          className="modules-btn modules-btn--secondary"
          disabled={autofillBusy}
          onClick={() => {
            const prompt = window.prompt("What should this text box say?");
            if (prompt?.trim()) onAutofill("generate", prompt.trim());
          }}
        >
          {autofillBusy ? "Working…" : "Generate text"}
        </button>
        {selectedIsText && (
          <>
            <button
              type="button"
              className="modules-btn modules-btn--ghost"
              disabled={autofillBusy || !hasSelection}
              onClick={() => onAutofill("rewrite")}
            >
              Rewrite
            </button>
            <button
              type="button"
              className="modules-btn modules-btn--ghost"
              disabled={autofillBusy || !hasSelection}
              onClick={() => onAutofill("expand")}
            >
              Expand
            </button>
            <button
              type="button"
              className="modules-btn modules-btn--ghost"
              disabled={autofillBusy || !hasSelection}
              onClick={() => onAutofill("shorten")}
            >
              Shorten
            </button>
          </>
        )}
      </div>

      <div className="modules-toolbar__group modules-toolbar__group--end">
        <button type="button" className="modules-btn modules-btn--present" onClick={onPresent}>
          Present
        </button>
      </div>
    </aside>
  );
}
