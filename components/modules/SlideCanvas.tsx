"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import type { PatientSimConfig, Slide, SlideElement } from "@/lib/modules/types";
import { MODULES_STAGE_H, MODULES_STAGE_W } from "@/lib/modules/types";
import { clampElement, sortByZ } from "@/lib/modules/elements";
import { slideBackgroundStyle } from "@/lib/modules/background";
import { getFontFamily } from "@/lib/modules/fonts";
import { SlideElementView } from "./SlideElementView";
import { PatientSimConfigPanel } from "./PatientSimConfigPanel";

type DragState = {
  id: string;
  mode: "move" | "se";
  startX: number;
  startY: number;
  startEl: { x: number; y: number; w: number; h: number };
};

type Props = {
  slide: Slide;
  selectedElementId: string | null;
  onSelectElement: (id: string | null) => void;
  onChangeElements: (elements: SlideElement[]) => void;
  onChangeSim?: (sim: Partial<PatientSimConfig>) => void;
  onTextSelection?: (info: { elementId: string; start: number; end: number; text: string } | null) => void;
  readOnly?: boolean;
};

export function SlideCanvas({
  slide,
  selectedElementId,
  onSelectElement,
  onChangeElements,
  onChangeSim,
  onTextSelection,
  readOnly = false,
}: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [textOverlay, setTextOverlay] = useState<{
    id: string;
    text: string;
    style: CSSProperties;
  } | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;

    const ro = new ResizeObserver(() => {
      const w = wrap.clientWidth;
      const h = wrap.clientHeight;
      if (w <= 0 || h <= 0) return;
      const scaleW = w / MODULES_STAGE_W;
      const scaleH = h / MODULES_STAGE_H;
      setScale(Math.min(scaleW, scaleH));
    });
    ro.observe(wrap);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (textOverlay) {
      setTimeout(() => textareaRef.current?.focus(), 16);
    }
  }, [textOverlay]);

  const toStageCoords = useCallback(
    (clientX: number, clientY: number) => {
      const rect = wrapRef.current!.getBoundingClientRect();
      return {
        x: (clientX - rect.left) / scale,
        y: (clientY - rect.top) / scale,
      };
    },
    [scale],
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent, id: string, mode: "move" | "se") => {
      if (readOnly || textOverlay) return;
      e.currentTarget.setPointerCapture(e.pointerId);
      const el = slide.elements.find((item) => item.id === id);
      if (!el) return;
      onSelectElement(id);
      const pt = toStageCoords(e.clientX, e.clientY);
      setDrag({
        id,
        mode,
        startX: pt.x,
        startY: pt.y,
        startEl: { x: el.x, y: el.y, w: el.w, h: el.h },
      });
    },
    [onSelectElement, readOnly, slide.elements, textOverlay, toStageCoords],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!drag) return;
      const pt = toStageCoords(e.clientX, e.clientY);
      const dx = pt.x - drag.startX;
      const dy = pt.y - drag.startY;

      onChangeElements(
        slide.elements.map((el) => {
          if (el.id !== drag.id) return el;
          if (drag.mode === "move") {
            return clampElement({
              ...el,
              x: drag.startEl.x + dx,
              y: drag.startEl.y + dy,
            });
          }
          return clampElement({
            ...el,
            w: drag.startEl.w + dx,
            h: drag.startEl.h + dy,
          });
        }),
      );
    },
    [drag, onChangeElements, slide.elements, toStageCoords],
  );

  const handlePointerUp = useCallback(() => setDrag(null), []);

  const handleCanvasPointerDown = (e: React.PointerEvent) => {
    if (readOnly) return;
    if (e.target === e.currentTarget) {
      onSelectElement(null);
      setTextOverlay(null);
    }
  };

  const handleDoubleClickText = (id: string) => {
    if (readOnly) return;
    const el = slide.elements.find((item) => item.id === id);
    if (!el || el.kind !== "text") return;
    onSelectElement(id);
    setTextOverlay({
      id,
      text: el.text,
      style: {
        left: el.x * scale,
        top: el.y * scale,
        width: el.w * scale,
        height: el.h * scale,
        fontSize: el.fontSize * scale,
        fontWeight: el.fontWeight,
        fontFamily: getFontFamily(el.fontStyle),
        color: el.color,
        textAlign: el.align,
      },
    });
  };

  const commitTextEdit = () => {
    if (!textOverlay) return;
    onChangeElements(
      slide.elements.map((el) =>
        el.id === textOverlay.id && el.kind === "text"
          ? { ...el, text: textOverlay.text }
          : el,
      ),
    );
    setTextOverlay(null);
    onTextSelection?.(null);
  };

  const reportSelection = () => {
    const ta = textareaRef.current;
    if (!ta || !textOverlay) {
      onTextSelection?.(null);
      return;
    }
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    if (start !== end) {
      onTextSelection?.({
        elementId: textOverlay.id,
        start,
        end,
        text: textOverlay.text.slice(start, end),
      });
    } else {
      onTextSelection?.(null);
    }
  };

  if (slide.kind === "patient-sim" && !readOnly) {
    return (
      <div className="modules-canvas-wrap modules-canvas-wrap--sim" ref={wrapRef}>
        <div className="modules-sim-config-card">
          <PatientSimConfigPanel
            sim={slide.sim}
            onChange={(sim) => onChangeSim?.(sim)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="modules-canvas-wrap" ref={wrapRef}>
      <div
        className="modules-canvas"
        style={{
          width: MODULES_STAGE_W * scale,
          height: MODULES_STAGE_H * scale,
          ...slideBackgroundStyle(slide.background),
        }}
        onPointerDown={handleCanvasPointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        {sortByZ(slide.elements).map((el) => (
          <SlideElementView
            key={el.id}
            element={el}
            selected={!readOnly && selectedElementId === el.id}
            scale={scale}
            onPointerDown={handlePointerDown}
            onDoubleClickText={handleDoubleClickText}
          />
        ))}

        {slide.kind === "patient-sim" && readOnly && (
          <div className="modules-canvas__sim-badge">Virtual patient slide</div>
        )}

        {textOverlay && (
          <textarea
            ref={textareaRef}
            className="modules-canvas__text-overlay"
            style={textOverlay.style}
            value={textOverlay.text}
            onChange={(e) =>
              setTextOverlay((prev) => prev && { ...prev, text: e.target.value })
            }
            onSelect={reportSelection}
            onKeyUp={reportSelection}
            onMouseUp={reportSelection}
            onBlur={commitTextEdit}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setTextOverlay(null);
                onTextSelection?.(null);
              }
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) commitTextEdit();
            }}
          />
        )}
      </div>
    </div>
  );
}
