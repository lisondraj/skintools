"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { SlideCanvas } from "@/components/modules/SlideCanvas";
import { SlideThumbnails } from "@/components/modules/SlideThumbnails";
import { ElementPropertiesPanel } from "@/components/modules/ElementPropertiesPanel";
import { ImageLibrary } from "@/components/modules/ImageLibrary";
import { PresentMode } from "@/components/modules/PresentMode";
import { autofillText } from "@/lib/modules/client";
import {
  createImageElement,
  createTextElement,
  duplicateElement,
  shiftElementZ,
} from "@/lib/modules/elements";
import {
  addSlide,
  deleteSlide,
  duplicateSlide,
  getDeck,
  hydrateDeck,
  moveSlide,
  nextElementZ,
  onStorageError,
  updateDeckTitle,
  updateSimConfig,
  updateSlide,
} from "@/lib/modules/storage";
import type { AutofillMode, Deck, SlideElement } from "@/lib/modules/types";

export default function ModulesPage() {
  const [deck, setDeck] = useState<Deck | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [presenting, setPresenting] = useState(false);
  const [autofillBusy, setAutofillBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    void hydrateDeck().then((d) => setDeck(d));
    return onStorageError((msg) => setError(msg));
  }, []);

  const activeSlide = deck?.slides[activeIndex];

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

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      if ((e.key === "Delete" || e.key === "Backspace") && selectedElementId) {
        e.preventDefault();
        handleDeleteElement();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleDeleteElement, selectedElementId]);

  function handleAddText() {
    if (!activeSlide || activeSlide.kind !== "content") return;
    const el = createTextElement(undefined, nextElementZ(activeSlide.elements));
    updateElements([...activeSlide.elements, el]);
    setSelectedElementId(el.id);
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
    setAutofillBusy(true);
    setError("");
    try {
      const text = await autofillText({
        mode,
        prompt,
        existingText: selected?.kind === "text" ? selected.text : undefined,
        deckTitle: deck.title,
        slideContext: `Slide ${activeIndex + 1}`,
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
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Autofill failed.");
    } finally {
      setAutofillBusy(false);
    }
  }

  if (presenting && deck) {
    return <PresentMode deck={deck} onExit={() => setPresenting(false)} />;
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
        </div>

        {isContent && (
          <div className="modules__topbar-tools">
            <button type="button" className="modules-action-btn" onClick={handleAddText}>
              + Text
            </button>
            <button type="button" className="modules-action-btn" onClick={() => setLibraryOpen(true)}>
              + Image
            </button>
          </div>
        )}

        <button
          type="button"
          className="modules-action-btn modules-action-btn--primary"
          onClick={() => setPresenting(true)}
        >
          Present
        </button>
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
          onSelect={(i) => { setActiveIndex(i); setSelectedElementId(null); }}
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
          <SlideCanvas
            slide={activeSlide}
            selectedElementId={selectedElementId}
            onSelectElement={setSelectedElementId}
            onChangeElements={updateElements}
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
          autofillBusy={autofillBusy}
          onUpdateText={(id, patch) => {
            updateElements(
              activeSlide.elements.map((el) =>
                el.id === id && el.kind === "text" ? { ...el, ...patch } : el,
              ),
            );
          }}
          onUpdateBackground={(color) => {
            const next = updateSlide(activeSlide.id, (slide) => ({ ...slide, background: color }));
            if (next) setDeck(next);
          }}
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
            ? "Double-click text to edit · Delete to remove selection"
            : "Configure the virtual patient in the canvas"}
        </span>
        <span>{deck.slides.length} slide{deck.slides.length === 1 ? "" : "s"}</span>
      </footer>

      <ImageLibrary
        open={libraryOpen}
        onClose={() => setLibraryOpen(false)}
        onSelectImage={handleAddImage}
      />
    </div>
  );
}
