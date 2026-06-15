"use client";

import type { Slide } from "@/lib/modules/types";
import { MODULES_STAGE_H, MODULES_STAGE_W } from "@/lib/modules/types";
import { slideBackgroundStyle } from "@/lib/modules/background";

type Props = {
  slides: Slide[];
  activeIndex: number;
  onSelect: (index: number) => void;
  onAdd: (kind: Slide["kind"]) => void;
  onDelete: (index: number) => void;
};

export function SlideThumbnails({
  slides,
  activeIndex,
  onSelect,
  onAdd,
  onDelete,
}: Props) {
  return (
    <aside className="modules-filmstrip">
      <div className="modules-filmstrip__header">
        <span className="modules-filmstrip__label">Slides</span>
      </div>
      <div className="modules-filmstrip__add-row">
        <button type="button" className="modules-btn modules-btn--secondary modules-filmstrip__add-btn" onClick={() => onAdd("content")}>
          + Slide
        </button>
        <button
          type="button"
          className="modules-btn modules-btn--secondary modules-filmstrip__add-btn"
          onClick={() => onAdd("patient-sim")}
          title="Add virtual patient slide"
        >
          + Sim
        </button>
      </div>

      <ol className="modules-filmstrip__list">
        {slides.map((slide, index) => (
          <li key={slide.id}>
            <button
              type="button"
              className={`modules-thumb${index === activeIndex ? " is-active" : ""}`}
              onClick={() => onSelect(index)}
            >
              <span className="modules-thumb__num">{index + 1}</span>
              <div
                className="modules-thumb__preview"
                style={slideBackgroundStyle(slide.background)}
              >
                {slide.kind === "patient-sim" ? (
                  <span className="modules-thumb__sim">Sim</span>
                ) : slide.elements.length === 0 ? (
                  <span className="modules-thumb__empty" />
                ) : (
                  slide.elements.slice(0, 4).map((el) => (
                    <span
                      key={el.id}
                      className={`modules-thumb__el modules-thumb__el--${el.kind}`}
                      style={{
                        left: `${(el.x / MODULES_STAGE_W) * 100}%`,
                        top: `${(el.y / MODULES_STAGE_H) * 100}%`,
                        width: `${(el.w / MODULES_STAGE_W) * 100}%`,
                        height: `${(el.h / MODULES_STAGE_H) * 100}%`,
                      }}
                    />
                  ))
                )}
              </div>
            </button>
            {slides.length > 1 && (
              <button
                type="button"
                className="modules-thumb__delete"
                aria-label={`Delete slide ${index + 1}`}
                onClick={() => onDelete(index)}
              >
                ×
              </button>
            )}
          </li>
        ))}
      </ol>
    </aside>
  );
}
