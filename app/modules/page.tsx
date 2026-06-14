"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { SlideCanvas } from "@/components/modules/SlideCanvas";
import { SlideThumbnails } from "@/components/modules/SlideThumbnails";
import { Toolbar } from "@/components/modules/Toolbar";
import { ImageLibrary } from "@/components/modules/ImageLibrary";
import { PresentMode } from "@/components/modules/PresentMode";
import { autofillText } from "@/lib/modules/client";
import {
  createImageElement,
  createTextElement,
} from "@/lib/modules/elements";
import {
  addSlide,
  deleteSlide,
  getDeck,
  hydrateDeck,
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

  const refreshDeck = useCallback(() => {
    setDeck(getDeck());
  }, []);

  const updateElements = useCallback(
    (elements: SlideElement[]) => {
      if (!deck || !activeSlide) return;
      updateSlide(activeSlide.id, (slide) => ({ ...slide, elements }));
      refreshDeck();
    },
    [activeSlide, deck, refreshDeck],
  );

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
      <div className="modules__shell">
        <div className="modules-loading">
          <span className="modules-spinner" />
          Loading deck…
        </div>
      </div>
    );
  }

  const selectedEl = activeSlide.elements.find((el) => el.id === selectedElementId);

  return (
    <div className="modules__shell">
      <header className="modules__header">
        <Link href="/modules" className="modules__logo">
          Modules
        </Link>
        <input
          className="modules__title-input"
          value={deck.title}
          onChange={(e) => {
            const next = updateDeckTitle(e.target.value);
            if (next) setDeck(next);
          }}
          aria-label="Presentation title"
        />
      </header>

      {error && <div className="modules-error">{error}</div>}

      <div className="modules__workspace">
        <SlideThumbnails
          slides={deck.slides}
          activeIndex={activeIndex}
          onSelect={setActiveIndex}
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

        <Toolbar
          onAddText={handleAddText}
          onAddImage={() => setLibraryOpen(true)}
          onPresent={() => setPresenting(true)}
          onAutofill={(mode, prompt) => void handleAutofill(mode, prompt)}
          autofillBusy={autofillBusy}
          hasSelection={Boolean(selectedElementId)}
          selectedIsText={selectedEl?.kind === "text"}
        />
      </div>

      <ImageLibrary
        open={libraryOpen}
        onClose={() => setLibraryOpen(false)}
        onSelectImage={handleAddImage}
      />
    </div>
  );
}
