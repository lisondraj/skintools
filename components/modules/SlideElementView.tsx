"use client";

import type { SlideElement } from "@/lib/modules/types";

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
        <div
          className="modules-el__text"
          style={{
            fontSize: element.fontSize * scale,
            fontWeight: element.fontWeight,
            color: element.color,
            textAlign: element.align,
          }}
        >
          {element.text || "Double-click to edit"}
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
