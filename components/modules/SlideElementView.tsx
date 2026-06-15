"use client";

import type { SlideElement } from "@/lib/modules/types";
import { getFontFamily } from "@/lib/modules/fonts";
import { RichTextContent } from "@/lib/modules/rich-text";
import { ShapeSvg } from "./ShapeSvg";

type Props = {
  element: SlideElement;
  selected: boolean;
  scale: number;
  onPointerDown: (e: React.PointerEvent, id: string, mode: "move" | "se") => void;
  onDoubleClickText?: (id: string) => void;
  onImageLoad?: (id: string, naturalWidth: number, naturalHeight: number) => void;
};

export function SlideElementView({
  element,
  selected,
  scale,
  onPointerDown,
  onDoubleClickText,
  onImageLoad,
}: Props) {
  const style: React.CSSProperties = {
    left: element.x * scale,
    top: element.y * scale,
    width: element.w * scale,
    height: element.h * scale,
    zIndex: element.z,
  };

  if (element.kind === "text") {
    return (
      <div
        className={`modules-el modules-el--text${selected ? " is-selected" : ""}`}
        style={style}
        onPointerDown={(e) => onPointerDown(e, element.id, "move")}
        onDoubleClick={() => onDoubleClickText?.(element.id)}
      >
        <div className="modules-el__text">
          <RichTextContent
            text={element.text || "Double-click to edit"}
            fontSize={element.fontSize}
            fontWeight={element.fontWeight}
            fontFamily={getFontFamily(element.fontStyle)}
            color={element.color}
            align={element.align}
            scale={scale}
          />
        </div>
        {selected && (
          <span
            className="modules-el__handle modules-el__handle--se"
            onPointerDown={(e) => {
              e.stopPropagation();
              onPointerDown(e, element.id, "se");
            }}
          />
        )}
      </div>
    );
  }

  if (element.kind === "shape") {
    return (
      <div
        className={`modules-el modules-el--shape${selected ? " is-selected" : ""}`}
        style={style}
        onPointerDown={(e) => onPointerDown(e, element.id, "move")}
      >
        <ShapeSvg element={element} scale={scale} />
        {selected && (
          <span
            className="modules-el__handle modules-el__handle--se"
            onPointerDown={(e) => {
              e.stopPropagation();
              onPointerDown(e, element.id, "se");
            }}
          />
        )}
      </div>
    );
  }

  const isLoading = element.loading || !element.src;

  return (
    <div
      className={`modules-el modules-el--image${selected ? " is-selected" : ""}${isLoading ? " is-loading" : ""}`}
      style={style}
      onPointerDown={(e) => onPointerDown(e, element.id, "move")}
    >
      {isLoading ? (
        <div className="modules-el__img-loading">
          <span className="modules-spinner" aria-hidden />
          <span className="modules-el__img-loading-label">Adding image…</span>
        </div>
      ) : (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={element.src}
          alt=""
          className="modules-el__img"
          draggable={false}
          onLoad={(e) => {
            const img = e.currentTarget;
            if (img.naturalWidth > 0 && img.naturalHeight > 0) {
              onImageLoad?.(element.id, img.naturalWidth, img.naturalHeight);
            }
          }}
        />
      )}
      {selected && !isLoading && (
        <span
          className="modules-el__handle modules-el__handle--se"
          onPointerDown={(e) => {
            e.stopPropagation();
            onPointerDown(e, element.id, "se");
          }}
        />
      )}
    </div>
  );
}
