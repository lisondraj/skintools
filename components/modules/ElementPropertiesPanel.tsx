"use client";

import { useState } from "react";
import type { AutofillMode, Slide, SlideElement, TextElement } from "@/lib/modules/types";

type Props = {
  slide: Slide;
  slideIndex: number;
  slideCount: number;
  selectedElement: SlideElement | undefined;
  autofillBusy: boolean;
  onUpdateText: (id: string, patch: Partial<TextElement>) => void;
  onUpdateBackground: (color: string) => void;
  onDeleteElement: () => void;
  onDuplicateElement: () => void;
  onBringForward: () => void;
  onSendBackward: () => void;
  onAutofill: (mode: AutofillMode, prompt?: string) => void;
  onDuplicateSlide: () => void;
  onMoveSlide: (direction: "up" | "down") => void;
  onDeleteSlide: () => void;
};

const BG_PRESETS = ["#ffffff", "#f7f7f7", "#111111", "#eef2ff", "#fef3c7", "#ecfdf5"];

export function ElementPropertiesPanel({
  slide,
  slideIndex,
  slideCount,
  selectedElement,
  autofillBusy,
  onUpdateText,
  onUpdateBackground,
  onDeleteElement,
  onDuplicateElement,
  onBringForward,
  onSendBackward,
  onAutofill,
  onDuplicateSlide,
  onMoveSlide,
  onDeleteSlide,
}: Props) {
  const [aiPrompt, setAiPrompt] = useState("");
  const isContent = slide.kind === "content";
  const isText = selectedElement?.kind === "text";

  return (
    <aside className="modules-panel" aria-label="Properties">
      <div className="modules-panel__section">
        <h2 className="modules-panel__heading">Slide</h2>
        <p className="modules-panel__meta">
          Slide {slideIndex + 1} of {slideCount}
          {slide.kind === "patient-sim" ? " · Virtual patient" : ""}
        </p>

        {isContent && (
          <label className="modules-field">
            <span className="modules-field__label">Background</span>
            <div className="modules-panel__swatches">
              {BG_PRESETS.map((color) => (
                <button
                  key={color}
                  type="button"
                  className={`modules-panel__swatch${slide.background === color ? " is-active" : ""}`}
                  style={{ background: color }}
                  aria-label={`Background ${color}`}
                  onClick={() => onUpdateBackground(color)}
                />
              ))}
              <input
                type="color"
                className="modules-panel__color-input"
                value={slide.background}
                onChange={(e) => onUpdateBackground(e.target.value)}
                aria-label="Custom background color"
              />
            </div>
          </label>
        )}

        <div className="modules-panel__btn-row">
          <button type="button" className="modules-btn modules-btn--secondary" onClick={onDuplicateSlide}>
            Duplicate
          </button>
          <button
            type="button"
            className="modules-btn modules-btn--secondary"
            disabled={slideIndex === 0}
            onClick={() => onMoveSlide("up")}
          >
            Move up
          </button>
          <button
            type="button"
            className="modules-btn modules-btn--secondary"
            disabled={slideIndex >= slideCount - 1}
            onClick={() => onMoveSlide("down")}
          >
            Move down
          </button>
        </div>
        {slideCount > 1 && (
          <button type="button" className="modules-btn modules-btn--ghost modules-panel__danger" onClick={onDeleteSlide}>
            Delete slide
          </button>
        )}
      </div>

      {isContent && !selectedElement && (
        <div className="modules-panel__section">
          <h2 className="modules-panel__heading">AI text</h2>
          <label className="modules-field">
            <span className="modules-field__label">Prompt</span>
            <textarea
              className="modules-field__input"
              rows={3}
              placeholder="Describe the text to add to this slide…"
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
            />
          </label>
          <button
            type="button"
            className="modules-btn modules-btn--primary modules-panel__full-btn"
            disabled={autofillBusy || !aiPrompt.trim()}
            onClick={() => {
              onAutofill("generate", aiPrompt.trim());
              setAiPrompt("");
            }}
          >
            {autofillBusy ? "Generating…" : "Generate text"}
          </button>
        </div>
      )}

      {isContent && selectedElement && (
        <div className="modules-panel__section">
          <h2 className="modules-panel__heading">
            {isText ? "Text" : "Image"}
          </h2>

          {isText && (
            <>
              <label className="modules-field">
                <span className="modules-field__label">Size ({selectedElement.fontSize}px)</span>
                <input
                  type="range"
                  min={12}
                  max={72}
                  value={selectedElement.fontSize}
                  onChange={(e) =>
                    onUpdateText(selectedElement.id, { fontSize: Number(e.target.value) })
                  }
                />
              </label>

              <label className="modules-field">
                <span className="modules-field__label">Weight</span>
                <select
                  className="modules-field__input"
                  value={selectedElement.fontWeight}
                  onChange={(e) =>
                    onUpdateText(selectedElement.id, { fontWeight: Number(e.target.value) })
                  }
                >
                  <option value={400}>Regular</option>
                  <option value={500}>Medium</option>
                  <option value={600}>Semibold</option>
                  <option value={700}>Bold</option>
                </select>
              </label>

              <label className="modules-field">
                <span className="modules-field__label">Color</span>
                <input
                  type="color"
                  className="modules-panel__color-input modules-panel__color-input--wide"
                  value={selectedElement.color}
                  onChange={(e) => onUpdateText(selectedElement.id, { color: e.target.value })}
                />
              </label>

              <div className="modules-field">
                <span className="modules-field__label">Align</span>
                <div className="modules-panel__align-row">
                  {(["left", "center", "right"] as const).map((align) => (
                    <button
                      key={align}
                      type="button"
                      className={`modules-btn modules-btn--secondary${selectedElement.align === align ? " is-active" : ""}`}
                      onClick={() => onUpdateText(selectedElement.id, { align })}
                    >
                      {align}
                    </button>
                  ))}
                </div>
              </div>

              <div className="modules-panel__btn-row">
                <button type="button" className="modules-btn modules-btn--secondary" disabled={autofillBusy} onClick={() => onAutofill("rewrite")}>
                  Rewrite
                </button>
                <button type="button" className="modules-btn modules-btn--secondary" disabled={autofillBusy} onClick={() => onAutofill("expand")}>
                  Expand
                </button>
                <button type="button" className="modules-btn modules-btn--secondary" disabled={autofillBusy} onClick={() => onAutofill("shorten")}>
                  Shorten
                </button>
              </div>
            </>
          )}

          <div className="modules-panel__btn-row">
            <button type="button" className="modules-btn modules-btn--secondary" onClick={onDuplicateElement}>
              Duplicate
            </button>
            <button type="button" className="modules-btn modules-btn--secondary" onClick={onBringForward}>
              Forward
            </button>
            <button type="button" className="modules-btn modules-btn--secondary" onClick={onSendBackward}>
              Back
            </button>
          </div>
          <button type="button" className="modules-btn modules-btn--ghost modules-panel__danger" onClick={onDeleteElement}>
            Delete element
          </button>
        </div>
      )}

      {slide.kind === "patient-sim" && (
        <div className="modules-panel__section">
          <h2 className="modules-panel__heading">Virtual patient</h2>
          <p className="modules-panel__hint">
            Configure persona, scenario, and voice in the canvas. During presentation, learners speak with this patient in real time.
          </p>
        </div>
      )}
    </aside>
  );
}
