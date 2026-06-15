"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { SlideCanvas } from "@/components/modules/SlideCanvas";
import { SlideThumbnails } from "@/components/modules/SlideThumbnails";
import { ElementPropertiesPanel, type TextSelectionInfo } from "@/components/modules/ElementPropertiesPanel";
import { ImageLibrary } from "@/components/modules/ImageLibrary";
import { DeckGeneratorModal } from "@/components/modules/DeckGeneratorModal";
import { PresentMode } from "@/components/modules/PresentMode";
import { autofillSlide, autofillText, generateDeck, generateSlideImage } from "@/lib/modules/client";
import {
  clampElement,
  createImageElement,
  createShapeElement,
  createTextElement,
  duplicateElement,
  shiftElementZ,
  slideElementsFromLayout,
} from "@/lib/modules/elements";
import {
  addSlide,
  createNewDeck,
  deleteSlide,
  duplicateSlide,
  exportDeckJson,
  getDeck,
  hydrateDeck,
  importDeckFromJson,
  moveSlide,
  nextElementZ,
  onStorageError,
  saveDeck,
  updateDeckTitle,
  updateSimConfig,
  updateSlide,
} from "@/lib/modules/storage";
import { buildSlideTemplate, type SlideTemplateId } from "@/lib/modules/templates";
import { buildDeckAIContext, buildSlideAIContext } from "@/lib/modules/context";
import { SHAPE_OPTIONS } from "@/lib/modules/shapes";
import type { AutofillMode, Deck, ShapeKind, SlideElement } from "@/lib/modules/types";

export default function ModulesPage() {
  const [deck, setDeck] = useState<Deck | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [deckGenOpen, setDeckGenOpen] = useState(false);
  const [shapeMenuOpen, setShapeMenuOpen] = useState(false);
  const [presenting, setPresenting] = useState(false);
  const [presentStartIndex, setPresentStartIndex] = useState(0);
  const [autofillBusy, setAutofillBusy] = useState(false);
  const [textSelection, setTextSelection] = useState<TextSelectionInfo | null>(null);
  const [error, setError] = useState("");
  const importRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void hydrateDeck().then((d) => setDeck(d));
    return onStorageError((msg) => setError(msg));
  }, []);

  const activeSlide = deck?.slides[activeIndex];

  const getSlideContext = useCallback(
    (selectedId?: string | null) => {
      if (!deck) return { text: "", images: [] };
      return buildSlideAIContext({
        deck,
        slideIndex: activeIndex,
        selectedElementId: selectedId ?? selectedElementId,
      });
    },
    [activeIndex, deck, selectedElementId],
  );

  const refreshDeck = useCallback(() => setDeck(getDeck()), []);

  const updateElements = useCallback(
    (elements: SlideElement[]) => {
      if (!deck || !activeSlide) return;
      updateSlide(activeSlide.id, (slide) => ({ ...slide, elements }));
      refreshDeck();
    },
    [activeSlide, deck, refreshDeck],
  );

  const handleDeleteElement = useCallback(() => {
    if (!activeSlide || !selectedElementId) return;
    updateElements(activeSlide.elements.filter((el) => el.id !== selectedElementId));
    setSelectedElementId(null);
  }, [activeSlide, selectedElementId, updateElements]);

  const nudgeElement = useCallback(
    (dx: number, dy: number) => {
      if (!activeSlide || !selectedElementId) return;
      updateElements(
        activeSlide.elements.map((el) =>
          el.id === selectedElementId
            ? clampElement({ ...el, x: el.x + dx, y: el.y + dy })
            : el,
        ),
      );
    },
    [activeSlide, selectedElementId, updateElements],
  );

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      if ((e.key === "Delete" || e.key === "Backspace") && selectedElementId) {
        e.preventDefault();
        handleDeleteElement();
        return;
      }

      const step = e.shiftKey ? 24 : 8;
      if (selectedElementId && ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
        e.preventDefault();
        if (e.key === "ArrowUp") nudgeElement(0, -step);
        if (e.key === "ArrowDown") nudgeElement(0, step);
        if (e.key === "ArrowLeft") nudgeElement(-step, 0);
        if (e.key === "ArrowRight") nudgeElement(step, 0);
        return;
      }

      if (!deck) return;
      if (e.key === "ArrowLeft" && activeIndex > 0) {
        setActiveIndex((i) => i - 1);
        setSelectedElementId(null);
      }
      if (e.key === "ArrowRight" && activeIndex < deck.slides.length - 1) {
        setActiveIndex((i) => i + 1);
        setSelectedElementId(null);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeIndex, deck, handleDeleteElement, nudgeElement, selectedElementId]);

  function handleAddText() {
    if (!activeSlide || activeSlide.kind !== "content") return;
    const el = createTextElement(undefined, nextElementZ(activeSlide.elements));
    updateElements([...activeSlide.elements, el]);
    setSelectedElementId(el.id);
  }

  function handleAddShape(shape: ShapeKind) {
    if (!activeSlide || activeSlide.kind !== "content") return;
    const el = createShapeElement(shape, nextElementZ(activeSlide.elements));
    updateElements([...activeSlide.elements, el]);
    setSelectedElementId(el.id);
    setShapeMenuOpen(false);
  }

  function handleAddImage(src: string) {
    if (!activeSlide || activeSlide.kind !== "content") return;
    const el = createImageElement(src, nextElementZ(activeSlide.elements));
    updateElements([...activeSlide.elements, el]);
    setSelectedElementId(el.id);
    setLibraryOpen(false);
  }

  async function handleAutofill(mode: AutofillMode, prompt?: string) {
    if (!deck || !activeSlide || activeSlide.kind !== "content") return;
    const selected = activeSlide.elements.find((el) => el.id === selectedElementId);
    const ctx = getSlideContext();

    setAutofillBusy(true);
    setError("");
    try {
      const useSelection =
        selected?.kind === "text" &&
        textSelection &&
        textSelection.elementId === selected.id &&
        textSelection.text.trim().length > 0 &&
        mode !== "generate";

      const text = await autofillText({
        mode,
        prompt,
        existingText: selected?.kind === "text" ? selected.text : undefined,
        selectedText: useSelection ? textSelection.text : undefined,
        selectionStart: useSelection ? textSelection.start : undefined,
        selectionEnd: useSelection ? textSelection.end : undefined,
        deckTitle: deck.title,
        slideContext: ctx.text,
        contextImages: ctx.images,
      });

      if (mode === "generate") {
        const el = createTextElement(text, nextElementZ(activeSlide.elements));
        updateElements([...activeSlide.elements, el]);
        setSelectedElementId(el.id);
      } else if (selected?.kind === "text") {
        updateElements(
          activeSlide.elements.map((el) =>
            el.id === selected.id && el.kind === "text" ? { ...el, text } : el,
          ),
        );
        setTextSelection(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Autofill failed.");
    } finally {
      setAutofillBusy(false);
    }
  }

  async function handleGenerateNotes() {
    if (!deck || !activeSlide || activeSlide.kind !== "content") return;
    setAutofillBusy(true);
    setError("");
    try {
      const ctx = getSlideContext();
      const notes = await autofillText({
        mode: "notes",
        deckTitle: deck.title,
        slideContext: ctx.text,
        contextImages: ctx.images,
      });
      const next = updateSlide(activeSlide.id, (slide) => ({ ...slide, notes }));
      if (next) setDeck(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Notes generation failed.");
    } finally {
      setAutofillBusy(false);
    }
  }

  async function handleGenerateSlide(prompt: string) {
    if (!deck || !activeSlide || activeSlide.kind !== "content") return;
    setAutofillBusy(true);
    setError("");
    try {
      const ctx = getSlideContext();
      const layout = await autofillSlide({
        prompt,
        deckTitle: deck.title,
        slideContext: ctx.text,
        contextImages: ctx.images,
      });
      const { elements } = slideElementsFromLayout(layout);
      updateElements(elements);
      setSelectedElementId(elements[0]?.id ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Slide generation failed.");
    } finally {
      setAutofillBusy(false);
    }
  }

  async function handleGenerateDeck(prompt: string, slideCount: number) {
    if (!deck) return;
    setAutofillBusy(true);
    setError("");
    try {
      const deckCtx = buildDeckAIContext(deck);
      const result = await generateDeck({
        prompt,
        slideCount,
        deckTitle: deck.title,
        slideContext: deckCtx.text,
        contextImages: deckCtx.images,
      });

      const next: Deck = {
        ...deck,
        title: result.deckTitle,
        slides: result.slides,
        updatedAt: Date.now(),
      };
      saveDeck(next);
      setDeck(next);
      setActiveIndex(0);
      setSelectedElementId(null);
      setDeckGenOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Deck generation failed.");
    } finally {
      setAutofillBusy(false);
    }
  }

  async function handleGenerateBackground(prompt: string) {
    if (!deck || !activeSlide || activeSlide.kind !== "content") return;
    setAutofillBusy(true);
    setError("");
    try {
      const image = await generateSlideImage({
        prompt,
        purpose: "background",
        qualityMode: "fast",
      });
      const next = updateSlide(activeSlide.id, (slide) => ({ ...slide, background: image }));
      if (next) setDeck(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Background generation failed.");
    } finally {
      setAutofillBusy(false);
    }
  }

  function handleApplyTemplate(templateId: SlideTemplateId) {
    if (!activeSlide || activeSlide.kind !== "content") return;
    updateElements(buildSlideTemplate(templateId));
    setSelectedElementId(null);
  }

  function handleExport() {
    const json = exportDeckJson();
    if (!json || !deck) return;
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${deck.title.replace(/[^a-z0-9-_]+/gi, "-").toLowerCase() || "presentation"}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleImportFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result;
      if (typeof text !== "string") return;
      const imported = importDeckFromJson(text);
      if (imported) {
        setDeck(imported);
        setActiveIndex(0);
        setSelectedElementId(null);
        setError("");
      } else {
        setError("Could not import deck. Check the file format.");
      }
    };
    reader.readAsText(file);
  }

  function startPresent(fromCurrent = false) {
    setPresentStartIndex(fromCurrent ? activeIndex : 0);
    setPresenting(true);
  }

  if (presenting && deck) {
    return (
      <PresentMode
        deck={deck}
        startIndex={presentStartIndex}
        onExit={() => setPresenting(false)}
      />
    );
  }

  if (!deck || !activeSlide) {
    return (
      <div className="modules__loading">
        <span className="modules-spinner" />
        Loading…
      </div>
    );
  }

  const selectedEl = activeSlide.elements.find((el) => el.id === selectedElementId);
  const isContent = activeSlide.kind === "content";

  return (
    <div className="modules__app">
      <header className="modules__topbar">
        <div className="modules__topbar-left">
          <Link href="/" className="modules__home-link" aria-label="Back to home">
            ←
          </Link>
          <span className="modules__divider" aria-hidden />
          <input
            className="modules__title-input"
            value={deck.title}
            onChange={(e) => {
              const next = updateDeckTitle(e.target.value);
              if (next) setDeck(next);
            }}
            aria-label="Presentation title"
          />
          <span className="modules__slide-badge">
            {activeIndex + 1}/{deck.slides.length}
          </span>
        </div>

        {isContent && (
          <div className="modules__topbar-tools">
            <button
              type="button"
              className="modules-action-btn modules-action-btn--primary"
              disabled={autofillBusy}
              onClick={() => setDeckGenOpen(true)}
            >
              AI Deck
            </button>
            <button type="button" className="modules-action-btn" onClick={handleAddText}>
              + Text
            </button>
            <button type="button" className="modules-action-btn" onClick={() => setLibraryOpen(true)}>
              + Image
            </button>
            <div className="modules__shape-menu">
              <button
                type="button"
                className="modules-action-btn"
                onClick={() => setShapeMenuOpen((open) => !open)}
              >
                + Shape
              </button>
              {shapeMenuOpen && (
                <div className="modules__shape-dropdown">
                  {SHAPE_OPTIONS.map((shape) => (
                    <button
                      key={shape.id}
                      type="button"
                      className="modules__shape-option"
                      onClick={() => handleAddShape(shape.id)}
                    >
                      {shape.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="modules__topbar-actions">
          <button
            type="button"
            className="modules-action-btn"
            onClick={() => {
              const next = createNewDeck();
              if (next) {
                setDeck(next);
                setActiveIndex(0);
                setSelectedElementId(null);
              }
            }}
          >
            New
          </button>
          <button type="button" className="modules-action-btn" onClick={handleExport}>
            Export
          </button>
          <button type="button" className="modules-action-btn" onClick={() => importRef.current?.click()}>
            Import
          </button>
          <button type="button" className="modules-action-btn" onClick={() => startPresent(true)}>
            Present here
          </button>
          <button
            type="button"
            className="modules-action-btn modules-action-btn--primary"
            onClick={() => startPresent(false)}
          >
            Present
          </button>
        </div>

        <input
          ref={importRef}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleImportFile(file);
            e.target.value = "";
          }}
        />
      </header>

      {error && (
        <div className="modules-error" role="alert">
          {error}
          <button type="button" className="modules-error__dismiss" onClick={() => setError("")}>×</button>
        </div>
      )}

      <div className="modules__workspace">
        <SlideThumbnails
          slides={deck.slides}
          activeIndex={activeIndex}
          onSelect={(i) => { setActiveIndex(i); setSelectedElementId(null); setTextSelection(null); }}
          onAdd={(kind) => {
            const next = addSlide(kind);
            if (next) {
              setDeck(next);
              setActiveIndex(next.slides.length - 1);
              setSelectedElementId(null);
            }
          }}
          onDelete={(index) => {
            const slide = deck.slides[index];
            const next = deleteSlide(slide.id);
            if (next) {
              setDeck(next);
              setActiveIndex(Math.min(index, next.slides.length - 1));
              setSelectedElementId(null);
            }
          }}
        />

        <main className="modules__canvas-area">
          {activeSlide.notes && (
            <div className="modules__notes-preview" aria-label="Speaker notes">
              <span className="modules__notes-label">Notes</span>
              {activeSlide.notes}
            </div>
          )}
          <SlideCanvas
            slide={activeSlide}
            selectedElementId={selectedElementId}
            onSelectElement={(id) => {
              setSelectedElementId(id);
              setTextSelection(null);
            }}
            onChangeElements={updateElements}
            onTextSelection={setTextSelection}
            onChangeSim={(sim) => {
              const next = updateSimConfig(activeSlide.id, sim);
              if (next) setDeck(next);
            }}
          />
        </main>

        <ElementPropertiesPanel
          slide={activeSlide}
          slideIndex={activeIndex}
          slideCount={deck.slides.length}
          selectedElement={selectedEl}
          textSelection={textSelection}
          autofillBusy={autofillBusy}
          onUpdateText={(id, patch) => {
            updateElements(
              activeSlide.elements.map((el) =>
                el.id === id && el.kind === "text" ? { ...el, ...patch } : el,
              ),
            );
          }}
          onUpdateShape={(id, patch) => {
            updateElements(
              activeSlide.elements.map((el) =>
                el.id === id && el.kind === "shape" ? { ...el, ...patch } : el,
              ),
            );
          }}
          onUpdateBackground={(background) => {
            const next = updateSlide(activeSlide.id, (slide) => ({ ...slide, background }));
            if (next) setDeck(next);
          }}
          onUpdateNotes={(notes) => {
            const next = updateSlide(activeSlide.id, (slide) => ({ ...slide, notes }));
            if (next) setDeck(next);
          }}
          onApplyTemplate={handleApplyTemplate}
          onDeleteElement={handleDeleteElement}
          onDuplicateElement={() => {
            if (!selectedEl) return;
            const copy = duplicateElement(selectedEl, nextElementZ(activeSlide.elements));
            updateElements([...activeSlide.elements, copy]);
            setSelectedElementId(copy.id);
          }}
          onBringForward={() => {
            if (!selectedElementId) return;
            updateElements(shiftElementZ(activeSlide.elements, selectedElementId, "forward"));
          }}
          onSendBackward={() => {
            if (!selectedElementId) return;
            updateElements(shiftElementZ(activeSlide.elements, selectedElementId, "backward"));
          }}
          onAutofill={(mode, prompt) => void handleAutofill(mode, prompt)}
          onGenerateSlide={(prompt) => void handleGenerateSlide(prompt)}
          onGenerateNotes={() => void handleGenerateNotes()}
          onGenerateBackground={(prompt) => void handleGenerateBackground(prompt)}
          onTextSelectionChange={setTextSelection}
          onDuplicateSlide={() => {
            const next = duplicateSlide(activeSlide.id);
            if (next) {
              setDeck(next);
              setActiveIndex(activeIndex + 1);
              setSelectedElementId(null);
            }
          }}
          onMoveSlide={(direction) => {
            const next = moveSlide(activeSlide.id, direction);
            if (next) {
              setDeck(next);
              const newIndex = direction === "up" ? activeIndex - 1 : activeIndex + 1;
              setActiveIndex(newIndex);
            }
          }}
          onDeleteSlide={() => {
            const next = deleteSlide(activeSlide.id);
            if (next) {
              setDeck(next);
              setActiveIndex(Math.min(activeIndex, next.slides.length - 1));
              setSelectedElementId(null);
            }
          }}
        />
      </div>

      <footer className="modules__statusbar">
        <span>
          {isContent
            ? "← → slides · Highlight text for AI edit · Double-click canvas to edit"
            : "Configure the virtual patient in the canvas"}
        </span>
        <span>{deck.slides.length} slide{deck.slides.length === 1 ? "" : "s"}</span>
      </footer>

      <ImageLibrary
        open={libraryOpen}
        onClose={() => setLibraryOpen(false)}
        onSelectImage={handleAddImage}
      />

      <DeckGeneratorModal
        open={deckGenOpen}
        busy={autofillBusy}
        onClose={() => setDeckGenOpen(false)}
        onGenerate={(prompt, count) => void handleGenerateDeck(prompt, count)}
      />
    </div>
  );
}
