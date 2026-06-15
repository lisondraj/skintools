"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { SlideCanvas } from "@/components/modules/SlideCanvas";
import { SlideThumbnails } from "@/components/modules/SlideThumbnails";
import { ElementPropertiesPanel, type TextSelectionInfo } from "@/components/modules/ElementPropertiesPanel";
import { ImageLibrary } from "@/components/modules/ImageLibrary";
import { DeckGeneratorModal } from "@/components/modules/DeckGeneratorModal";
import { PresentMode } from "@/components/modules/PresentMode";
import { SpeakerNotesBar } from "@/components/modules/SpeakerNotesBar";
import { ModulesLoadingOverlay } from "@/components/modules/ModulesLoadingOverlay";
import { autofillSlide, autofillText, generateDeck, generateSlideImage } from "@/lib/modules/client";
import { fitImageElementToNaturalSize } from "@/lib/modules/image-fit";
import {
  DECK_LOADING_PHASES,
  runWithLoadingLabel,
  runWithLoadingProgress,
  SLIDE_LOADING_PHASES,
  type LoadingUpdate,
} from "@/lib/modules/loading-progress";
import {
  clampElement,
  createImageElement,
  createShapeElement,
  createTextElement,
  duplicateElement,
  shiftElementZ,
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

type MobileTab = "slides" | "canvas" | "tools";

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
  const [mobileTab, setMobileTab] = useState<MobileTab>("canvas");
  const [loadingProgress, setLoadingProgress] = useState<LoadingUpdate | null>(null);
  const [backgroundLoading, setBackgroundLoading] = useState(false);
  const [textSelection, setTextSelection] = useState<TextSelectionInfo | null>(null);
  const [error, setError] = useState("");
  const [notesOpen, setNotesOpen] = useState(false);
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

  const setBusyLoading = useCallback((update: LoadingUpdate | null) => {
    setLoadingProgress(update);
    setAutofillBusy(update !== null);
  }, []);

  const updateElementsForSlide = useCallback(
    (slideId: string, elements: SlideElement[]) => {
      if (!deck) return;
      const next = updateSlide(slideId, (slide) => ({ ...slide, elements }));
      if (next) setDeck(next);
    },
    [deck],
  );

  const updateElements = useCallback(
    (elements: SlideElement[]) => {
      if (!deck || !activeSlide) return;
      updateElementsForSlide(activeSlide.id, elements);
    },
    [activeSlide, deck, updateElementsForSlide],
  );

  const handleImageLoad = useCallback(
    (id: string, naturalWidth: number, naturalHeight: number) => {
      if (!activeSlide) return;
      updateElements(
        activeSlide.elements.map((el) => {
          if (el.id !== id || el.kind !== "image" || el.loading) return el;
          return fitImageElementToNaturalSize(el, naturalWidth, naturalHeight);
        }),
      );
    },
    [activeSlide, updateElements],
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

  async function handleGenerateImageOnSlide(
    prompt: string,
    qualityMode: "fast" | "quality" = "fast",
  ) {
    if (!activeSlide || activeSlide.kind !== "content") return;
    const slideId = activeSlide.id;
    const placeholder = createImageElement("", nextElementZ(activeSlide.elements), { loading: true });
    const placeholderId = placeholder.id;

    updateElements([...activeSlide.elements, placeholder]);
    setSelectedElementId(placeholderId);
    setLibraryOpen(false);

    try {
      await runWithLoadingLabel("Adding image…", setBusyLoading, async () => {
        const src = await generateSlideImage({
          prompt: prompt.trim(),
          purpose: "image",
          qualityMode,
        });
        const current = getDeck()?.slides.find((s) => s.id === slideId);
        if (!current) return;
        updateElementsForSlide(
          slideId,
          current.elements.map((el) =>
            el.id === placeholderId && el.kind === "image"
              ? { ...el, src, loading: false }
              : el,
          ),
        );
      });
    } catch (err) {
      const current = getDeck()?.slides.find((s) => s.id === slideId);
      if (current) {
        updateElementsForSlide(
          slideId,
          current.elements.filter((el) => el.id !== placeholderId),
        );
      }
      setError(err instanceof Error ? err.message : "Image generation failed.");
    }
  }

  async function handleAutofill(mode: AutofillMode, prompt?: string) {
    if (!deck || !activeSlide || activeSlide.kind !== "content") return;
    const selected = activeSlide.elements.find((el) => el.id === selectedElementId);
    const ctx = getSlideContext();

    setBusyLoading({ label: "Writing content…", progress: 8 });
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
      setBusyLoading(null);
    }
  }

  async function handleGenerateNotes() {
    if (!deck || !activeSlide || activeSlide.kind !== "content") return;
    setError("");
    try {
      await runWithLoadingLabel("Writing speaker notes…", setBusyLoading, async () => {
        const ctx = getSlideContext();
        const notes = await autofillText({
          mode: "notes",
          deckTitle: deck.title,
          slideContext: ctx.text,
          contextImages: ctx.images,
        });
        const next = updateSlide(activeSlide.id, (slide) => ({ ...slide, notes }));
        if (next) setDeck(next);
        setNotesOpen(true);
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Notes generation failed.");
    }
  }

  async function handleGenerateSlide(prompt: string) {
    if (!deck || !activeSlide || activeSlide.kind !== "content") return;
    setError("");
    try {
      await runWithLoadingProgress(SLIDE_LOADING_PHASES, setBusyLoading, async () => {
        const ctx = getSlideContext();
        const result = await autofillSlide({
          prompt,
          deckTitle: deck.title,
          slideContext: ctx.text,
          contextImages: ctx.images,
        });
        const next = updateSlide(activeSlide.id, (slide) => ({
          ...slide,
          elements: result.elements,
          background: result.background,
          notes: result.notes ?? slide.notes,
        }));
        if (next) setDeck(next);
        setSelectedElementId(result.elements[0]?.id ?? null);
        if (result.notes?.trim()) setNotesOpen(true);
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Slide generation failed.");
    }
  }

  async function handleGenerateDeck(prompt: string, slideCount: number) {
    if (!deck) return;
    setError("");
    try {
      await runWithLoadingProgress(DECK_LOADING_PHASES, setBusyLoading, async () => {
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
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Deck generation failed.");
    }
  }

  async function handleGenerateBackground(prompt: string) {
    if (!deck || !activeSlide || activeSlide.kind !== "content") return;
    setBackgroundLoading(true);
    setError("");
    try {
      await runWithLoadingLabel("Generating background…", setBusyLoading, async () => {
        const image = await generateSlideImage({
          prompt,
          purpose: "background",
          qualityMode: "fast",
        });
        const next = updateSlide(activeSlide.id, (slide) => ({ ...slide, background: image }));
        if (next) setDeck(next);
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Background generation failed.");
    } finally {
      setBackgroundLoading(false);
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
      <div className="modules modules__loading">
        <div className="modules-loading-overlay__card modules__loading-card">
          <span className="modules-spinner modules-loading-overlay__spinner" aria-hidden />
          <p className="modules-loading-overlay__label">Loading presentation…</p>
        </div>
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

      <div className="modules__workspace" data-mobile-tab={mobileTab}>
        <div className={`modules__mobile-panel${mobileTab === "slides" ? " is-active" : ""}`} aria-hidden={mobileTab !== "slides"}>
        <SlideThumbnails
          slides={deck.slides}
          activeIndex={activeIndex}
          onSelect={(i) => { setActiveIndex(i); setSelectedElementId(null); setTextSelection(null); setMobileTab("canvas"); }}
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
        </div>

        <main className={`modules__canvas-area${mobileTab === "canvas" ? " modules__mobile-panel is-active" : " modules__mobile-panel"}`} aria-hidden={mobileTab !== "canvas"}>
          {isContent && (
            <div className="modules__mobile-tools">
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
              <button
                type="button"
                className="modules-action-btn"
                onClick={() => startPresent(false)}
              >
                Present
              </button>
            </div>
          )}
          <div className="modules__slide-column">
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
              onImageLoad={handleImageLoad}
              backgroundLoading={backgroundLoading}
            />
            <SpeakerNotesBar
              notes={activeSlide.notes ?? ""}
              open={notesOpen}
              busy={autofillBusy}
              canGenerate={isContent}
              onToggle={() => setNotesOpen((open) => !open)}
              onUpdateNotes={(notes) => {
                const next = updateSlide(activeSlide.id, (slide) => ({ ...slide, notes }));
                if (next) setDeck(next);
              }}
              onGenerateNotes={() => void handleGenerateNotes()}
            />
          </div>
        </main>

        <div className={`modules__mobile-panel${mobileTab === "tools" ? " is-active" : ""}`} aria-hidden={mobileTab !== "tools"}>
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
      </div>

      {/* Mobile bottom navigation */}
      <nav className="modules__mobile-nav" aria-label="Mobile navigation">
        <button
          type="button"
          className={`modules__mobile-nav-btn${mobileTab === "slides" ? " is-active" : ""}`}
          onClick={() => setMobileTab("slides")}
        >
          <span className="modules__mobile-nav-icon" aria-hidden>⊞</span>
          <span>Slides</span>
        </button>
        <button
          type="button"
          className={`modules__mobile-nav-btn${mobileTab === "canvas" ? " is-active" : ""}`}
          onClick={() => setMobileTab("canvas")}
        >
          <span className="modules__mobile-nav-icon" aria-hidden>◻</span>
          <span>Canvas</span>
        </button>
        <button
          type="button"
          className={`modules__mobile-nav-btn${mobileTab === "tools" ? " is-active" : ""}`}
          onClick={() => setMobileTab("tools")}
        >
          <span className="modules__mobile-nav-icon" aria-hidden>⚙</span>
          <span>Tools</span>
        </button>
      </nav>

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
        onGenerateToSlide={(prompt, qualityMode) =>
          void handleGenerateImageOnSlide(prompt, qualityMode)
        }
        busy={autofillBusy}
      />

      <DeckGeneratorModal
        open={deckGenOpen}
        busy={autofillBusy}
        loading={loadingProgress}
        onClose={() => !autofillBusy && setDeckGenOpen(false)}
        onGenerate={(prompt, count) => void handleGenerateDeck(prompt, count)}
      />

      <ModulesLoadingOverlay loading={deckGenOpen ? null : loadingProgress} />
    </div>
  );
}
