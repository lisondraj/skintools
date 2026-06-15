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
};

export function SlideElementView({
  element,
  selected,
  scale,
  onPointerDown,
  onDoubleClickText,
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

  return (
    <div
      className={`modules-el modules-el--image${selected ? " is-selected" : ""}`}
      style={style}
      onPointerDown={(e) => onPointerDown(e, element.id, "move")}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={element.src} alt="" className="modules-el__img" draggable={false} />
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
