"use client";

import { useState } from "react";
import type { AutofillMode, Slide, SlideElement, TextElement } from "@/lib/modules/types";
import { SLIDE_TEMPLATES, type SlideTemplateId } from "@/lib/modules/templates";

type Props = {
  slide: Slide;
  slideIndex: number;
  slideCount: number;
  selectedElement: SlideElement | undefined;
  autofillBusy: boolean;
  onUpdateText: (id: string, patch: Partial<TextElement>) => void;
  onUpdateBackground: (color: string) => void;
  onUpdateNotes: (notes: string) => void;
  onApplyTemplate: (templateId: SlideTemplateId) => void;
  onDeleteElement: () => void;
  onDuplicateElement: () => void;
  onBringForward: () => void;
  onSendBackward: () => void;
  onAutofill: (mode: AutofillMode, prompt?: string) => void;
  onGenerateSlide: (prompt: string) => void;
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
  onUpdateNotes,
  onApplyTemplate,
  onDeleteElement,
  onDuplicateElement,
  onBringForward,
  onSendBackward,
  onAutofill,
  onGenerateSlide,
  onDuplicateSlide,
  onMoveSlide,
  onDeleteSlide,
}: Props) {
  const [aiPrompt, setAiPrompt] = useState("");
  const [slidePrompt, setSlidePrompt] = useState("");
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
          <>
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

            <label className="modules-field">
              <span className="modules-field__label">Layout template</span>
              <select
                className="modules-field__input"
                defaultValue=""
                onChange={(e) => {
                  const id = e.target.value as SlideTemplateId;
                  if (id) {
                    onApplyTemplate(id);
                    e.target.value = "";
                  }
                }}
              >
                <option value="" disabled>
                  Choose a layout…
                </option>
                {SLIDE_TEMPLATES.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
            </label>
          </>
        )}

        <label className="modules-field">
          <span className="modules-field__label">Speaker notes</span>
          <textarea
            className="modules-field__input"
            rows={3}
            placeholder="Notes visible only to you during editing…"
            value={slide.notes ?? ""}
            onChange={(e) => onUpdateNotes(e.target.value)}
          />
        </label>

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
            Up
          </button>
          <button
            type="button"
            className="modules-btn modules-btn--secondary"
            disabled={slideIndex >= slideCount - 1}
            onClick={() => onMoveSlide("down")}
          >
            Down
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
          <h2 className="modules-panel__heading">AI</h2>
          <label className="modules-field">
            <span className="modules-field__label">Generate full slide</span>
            <textarea
              className="modules-field__input"
              rows={2}
              placeholder="Topic for title + body…"
              value={slidePrompt}
              onChange={(e) => setSlidePrompt(e.target.value)}
            />
          </label>
          <button
            type="button"
            className="modules-btn modules-btn--primary modules-panel__full-btn"
            disabled={autofillBusy || !slidePrompt.trim()}
            onClick={() => {
              onGenerateSlide(slidePrompt.trim());
              setSlidePrompt("");
            }}
          >
            {autofillBusy ? "Generating…" : "Generate slide"}
          </button>

          <label className="modules-field">
            <span className="modules-field__label">Add text box</span>
            <textarea
              className="modules-field__input"
              rows={2}
              placeholder="Single text box content…"
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
            />
          </label>
          <button
            type="button"
            className="modules-btn modules-btn--secondary modules-panel__full-btn"
            disabled={autofillBusy || !aiPrompt.trim()}
            onClick={() => {
              onAutofill("generate", aiPrompt.trim());
              setAiPrompt("");
            }}
          >
            {autofillBusy ? "Working…" : "Generate text box"}
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
            Configure persona and scenario in the canvas. Voice is set server-side via ELEVENLABS_VOICE_ID.
          </p>
        </div>
      )}
    </aside>
  );
}
