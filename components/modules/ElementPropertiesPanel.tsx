"use client";

import { useRef, useState } from "react";
import type { AutofillMode, ShapeElement, Slide, SlideElement, TextElement } from "@/lib/modules/types";
import { SLIDE_TEMPLATES, type SlideTemplateId } from "@/lib/modules/templates";
import { SELECTION_AI_ACTIONS, TEXT_AI_ACTIONS } from "@/lib/modules/ai-actions";
import { SLIDE_FONT_STYLES } from "@/lib/modules/fonts";
import { SHAPE_OPTIONS } from "@/lib/modules/shapes";
import { RICH_TEXT_HINT } from "@/lib/modules/rich-text";
import { isSlideBackgroundImage } from "@/lib/modules/background";

export type TextSelectionInfo = {
  elementId: string;
  start: number;
  end: number;
  text: string;
};

type Props = {
  slide: Slide;
  slideIndex: number;
  slideCount: number;
  selectedElement: SlideElement | undefined;
  textSelection: TextSelectionInfo | null;
  autofillBusy: boolean;
  onUpdateText: (id: string, patch: Partial<TextElement>) => void;
  onUpdateShape: (id: string, patch: Partial<ShapeElement>) => void;
  onUpdateBackground: (background: string) => void;
  onUpdateNotes: (notes: string) => void;
  onApplyTemplate: (templateId: SlideTemplateId) => void;
  onDeleteElement: () => void;
  onDuplicateElement: () => void;
  onBringForward: () => void;
  onSendBackward: () => void;
  onAutofill: (mode: AutofillMode, prompt?: string) => void;
  onGenerateSlide: (prompt: string) => void;
  onGenerateNotes: () => void;
  onGenerateBackground: (prompt: string) => void;
  onTextSelectionChange: (info: TextSelectionInfo | null) => void;
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
  textSelection,
  autofillBusy,
  onUpdateText,
  onUpdateShape,
  onUpdateBackground,
  onUpdateNotes,
  onApplyTemplate,
  onDeleteElement,
  onDuplicateElement,
  onBringForward,
  onSendBackward,
  onAutofill,
  onGenerateSlide,
  onGenerateNotes,
  onGenerateBackground,
  onTextSelectionChange,
  onDuplicateSlide,
  onMoveSlide,
  onDeleteSlide,
}: Props) {
  const [aiPrompt, setAiPrompt] = useState("");
  const [slidePrompt, setSlidePrompt] = useState("");
  const [selectionPrompt, setSelectionPrompt] = useState("");
  const [bgPrompt, setBgPrompt] = useState("");
  const contentRef = useRef<HTMLTextAreaElement>(null);
  const isContent = slide.kind === "content";
  const isText = selectedElement?.kind === "text";
  const isShape = selectedElement?.kind === "shape";
  const hasSelection =
    isText &&
    textSelection &&
    textSelection.elementId === selectedElement.id &&
    textSelection.text.trim().length > 0;

  function reportPanelSelection() {
    const ta = contentRef.current;
    if (!ta || !isText) {
      onTextSelectionChange(null);
      return;
    }
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    if (start !== end) {
      onTextSelectionChange({
        elementId: selectedElement.id,
        start,
        end,
        text: ta.value.slice(start, end),
      });
    } else {
      onTextSelectionChange(null);
    }
  }

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
                  value={isSlideBackgroundImage(slide.background) ? "#ffffff" : slide.background}
                  onChange={(e) => onUpdateBackground(e.target.value)}
                  aria-label="Custom background color"
                />
              </div>
              {isSlideBackgroundImage(slide.background) && (
                <button
                  type="button"
                  className="modules-btn modules-btn--ghost modules-panel__full-btn"
                  onClick={() => onUpdateBackground("#ffffff")}
                >
                  Remove background image
                </button>
              )}
            </label>

            <label className="modules-field">
              <span className="modules-field__label">AI background (GPT Image 2)</span>
              <textarea
                className="modules-field__input"
                rows={2}
                placeholder="e.g. Soft blue gradient, abstract medical theme, minimal…"
                value={bgPrompt}
                onChange={(e) => setBgPrompt(e.target.value)}
              />
            </label>
            <button
              type="button"
              className="modules-btn modules-btn--secondary modules-panel__full-btn"
              disabled={autofillBusy || !bgPrompt.trim()}
              onClick={() => {
                onGenerateBackground(bgPrompt.trim());
                setBgPrompt("");
              }}
            >
              {autofillBusy ? "Generating…" : "Generate background"}
            </button>

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
        {isContent && (
          <button
            type="button"
            className="modules-btn modules-btn--secondary modules-panel__full-btn"
            disabled={autofillBusy}
            onClick={onGenerateNotes}
          >
            {autofillBusy ? "Working…" : "AI generate notes"}
          </button>
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
          <p className="modules-panel__hint">
            AI uses this slide&apos;s content, neighbouring slides, and deck title as context.
          </p>
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
            {isText ? "Text" : isShape ? "Shape" : "Image"}
          </h2>

          {isText && (
            <>
              <p className="modules-panel__hint">{RICH_TEXT_HINT}</p>
              <label className="modules-field">
                <span className="modules-field__label">Content</span>
                <textarea
                  ref={contentRef}
                  className="modules-field__input modules-field__input--content"
                  rows={5}
                  value={selectedElement.text}
                  onChange={(e) => onUpdateText(selectedElement.id, { text: e.target.value })}
                  onSelect={reportPanelSelection}
                  onKeyUp={reportPanelSelection}
                  onMouseUp={reportPanelSelection}
                />
              </label>

              {hasSelection && (
                <div className="modules-panel__selection">
                  <span className="modules-panel__selection-label">Selected</span>
                  <p className="modules-panel__selection-text">&ldquo;{textSelection.text}&rdquo;</p>
                </div>
              )}

              <div className="modules-field">
                <span className="modules-field__label">
                  {hasSelection ? "AI · selection" : "AI · whole text box"}
                </span>
                <div className="modules-panel__ai-grid">
                  {(hasSelection ? SELECTION_AI_ACTIONS : TEXT_AI_ACTIONS)
                    .filter((a) => a.mode !== "edit-selection")
                    .map((action) => (
                      <button
                        key={action.mode + action.label}
                        type="button"
                        className="modules-btn modules-btn--secondary modules-panel__ai-btn"
                        disabled={autofillBusy}
                        title={action.description}
                        onClick={() => onAutofill(action.mode)}
                      >
                        {action.label}
                      </button>
                    ))}
                </div>
              </div>

              {hasSelection && (
                <>
                  <label className="modules-field">
                    <span className="modules-field__label">AI edit selection</span>
                    <textarea
                      className="modules-field__input"
                      rows={2}
                      placeholder="e.g. Make this more reassuring, add OHIP context…"
                      value={selectionPrompt}
                      onChange={(e) => setSelectionPrompt(e.target.value)}
                    />
                  </label>
                  <button
                    type="button"
                    className="modules-btn modules-btn--primary modules-panel__full-btn"
                    disabled={autofillBusy || !selectionPrompt.trim()}
                    onClick={() => {
                      onAutofill("edit-selection", selectionPrompt.trim());
                      setSelectionPrompt("");
                    }}
                  >
                    {autofillBusy ? "Editing…" : "Apply to selection"}
                  </button>
                </>
              )}

              <div className="modules-field">
                <span className="modules-field__label">Font</span>
                <div className="modules-panel__font-grid">
                  {SLIDE_FONT_STYLES.map((font) => (
                    <button
                      key={font.id}
                      type="button"
                      className={`modules-panel__font-btn${(selectedElement.fontStyle ?? "inter") === font.id ? " is-active" : ""}`}
                      style={{ fontFamily: font.cssFamily }}
                      onClick={() => onUpdateText(selectedElement.id, { fontStyle: font.id })}
                      title={font.label}
                    >
                      <span className="modules-panel__font-sample">Aa</span>
                      <span className="modules-panel__font-name">{font.label}</span>
                    </button>
                  ))}
                </div>
              </div>

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
            </>
          )}

          {isShape && selectedElement.kind === "shape" && (
            <>
              <label className="modules-field">
                <span className="modules-field__label">Shape</span>
                <select
                  className="modules-field__input"
                  value={selectedElement.shape}
                  onChange={(e) =>
                    onUpdateShape(selectedElement.id, {
                      shape: e.target.value as ShapeElement["shape"],
                    })
                  }
                >
                  {SHAPE_OPTIONS.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="modules-field">
                <span className="modules-field__label">Fill</span>
                <input
                  type="color"
                  className="modules-panel__color-input modules-panel__color-input--wide"
                  value={selectedElement.fill}
                  onChange={(e) => onUpdateShape(selectedElement.id, { fill: e.target.value })}
                />
              </label>

              <label className="modules-field">
                <span className="modules-field__label">Stroke</span>
                <input
                  type="color"
                  className="modules-panel__color-input modules-panel__color-input--wide"
                  value={selectedElement.stroke}
                  onChange={(e) => onUpdateShape(selectedElement.id, { stroke: e.target.value })}
                />
              </label>

              <label className="modules-field">
                <span className="modules-field__label">Stroke width ({selectedElement.strokeWidth}px)</span>
                <input
                  type="range"
                  min={0}
                  max={12}
                  value={selectedElement.strokeWidth}
                  onChange={(e) =>
                    onUpdateShape(selectedElement.id, { strokeWidth: Number(e.target.value) })
                  }
                />
              </label>

              <label className="modules-field">
                <span className="modules-field__label">Opacity ({Math.round(selectedElement.opacity * 100)}%)</span>
                <input
                  type="range"
                  min={0.1}
                  max={1}
                  step={0.05}
                  value={selectedElement.opacity}
                  onChange={(e) =>
                    onUpdateShape(selectedElement.id, { opacity: Number(e.target.value) })
                  }
                />
              </label>
            </>
          )}

          {(isText || isShape || selectedElement?.kind === "image") && (
            <>
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
            </>
          )}
        </div>
      )}

      {slide.kind === "patient-sim" && (
        <div className="modules-panel__section">
          <h2 className="modules-panel__heading">Virtual patient</h2>
          <p className="modules-panel__hint">
            Configure persona and scenario in the canvas. Set ELEVENLABS_AGENT_ID and ELEVENLABS_VOICE_ID in Vercel. Enable prompt override on your ConvAI agent.
          </p>
        </div>
      )}
    </aside>
  );
}
