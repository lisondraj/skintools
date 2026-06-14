"use client";

import {
  useState,
  useRef,
  useCallback,
  useEffect,
  type CSSProperties,
} from "react";
import type {
  IGElement,
  IGRectEl,
  IGTextEl,
  InfographicDoc,
} from "@/lib/infographic/types";
import { InfographicSVG } from "./InfographicSVG";
import { wrapText } from "@/lib/infographic/utils";

type Props = {
  doc: InfographicDoc;
  onBack: () => void;
};

type DragState = {
  id: string;
  mode: "move" | "nw" | "ne" | "sw" | "se";
  startSvg: { x: number; y: number };
  startEl: { x: number; y: number; w?: number; h?: number; cx?: number; cy?: number };
};

type TextOverlay = {
  id: string;
  text: string;
  style: CSSProperties;
};

function getBBox(el: IGElement): { x: number; y: number; w: number; h: number } | null {
  if (el.kind === "rect") return { x: el.x, y: el.y, w: el.w, h: el.h };
  if (el.kind === "circle") {
    return { x: el.cx - el.r, y: el.cy - el.r, w: el.r * 2, h: el.r * 2 };
  }
  if (el.kind === "text") {
    const lineH = el.lineH ?? el.fontSize * 1.4;
    const h = Math.max(el.lines.length, 1) * lineH + el.fontSize;
    const w = el.anchor === "middle" ? 380 : 400;
    const x = el.anchor === "middle" ? el.x - w / 2 : el.x;
    return { x, y: el.y - el.fontSize, w, h };
  }
  return null;
}

function toSVGCoords(svg: SVGSVGElement, clientX: number, clientY: number) {
  const pt = svg.createSVGPoint();
  pt.x = clientX;
  pt.y = clientY;
  const ctm = svg.getScreenCTM();
  if (!ctm) return { x: 0, y: 0 };
  const p = pt.matrixTransform(ctm.inverse());
  return { x: p.x, y: p.y };
}

function svgToLocal(
  svg: SVGSVGElement,
  wrap: HTMLDivElement,
  svgX: number,
  svgY: number,
) {
  const pt = svg.createSVGPoint();
  pt.x = svgX;
  pt.y = svgY;
  const ctm = svg.getScreenCTM();
  if (!ctm) return { x: 0, y: 0 };
  const screen = pt.matrixTransform(ctm);
  const wr = wrap.getBoundingClientRect();
  return { x: screen.x - wr.left, y: screen.y - wr.top };
}

export function InfographicEditor({ doc, onBack }: Props) {
  const [elements, setElements] = useState<IGElement[]>(doc.elements);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [textOverlay, setTextOverlay] = useState<TextOverlay | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [exportMsg, setExportMsg] = useState("");
  const svgRef = useRef<SVGSVGElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync from fresh doc when it changes (e.g., going back + re-selecting)
  useEffect(() => {
    setElements(doc.elements);
    setSelectedId(null);
    setTextOverlay(null);
    setDrag(null);
  }, [doc]);

  // Focus textarea when it appears
  useEffect(() => {
    if (textOverlay) {
      setTimeout(() => textareaRef.current?.focus(), 16);
    }
  }, [textOverlay]);

  const liveDoc: InfographicDoc = { ...doc, elements };

  function hitTest(svgX: number, svgY: number): string | null {
    for (let i = elements.length - 1; i >= 0; i--) {
      const el = elements[i];
      if (!el.selectable) continue;
      const bbox = getBBox(el);
      if (!bbox) continue;
      if (
        svgX >= bbox.x &&
        svgX <= bbox.x + bbox.w &&
        svgY >= bbox.y &&
        svgY <= bbox.y + bbox.h
      ) {
        return el.id;
      }
    }
    return null;
  }

  function isNearHandle(
    svgPt: { x: number; y: number },
    sel: IGElement,
  ): DragState["mode"] | null {
    const bbox = getBBox(sel);
    if (!bbox) return null;
    const handles: Array<[number, number, DragState["mode"]]> = [
      [bbox.x, bbox.y, "nw"],
      [bbox.x + bbox.w, bbox.y, "ne"],
      [bbox.x, bbox.y + bbox.h, "sw"],
      [bbox.x + bbox.w, bbox.y + bbox.h, "se"],
    ];
    const thresh = 12;
    for (const [hx, hy, dir] of handles) {
      if (Math.abs(svgPt.x - hx) < thresh && Math.abs(svgPt.y - hy) < thresh) {
        return dir;
      }
    }
    return null;
  }

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (textOverlay) return;
      e.currentTarget.setPointerCapture(e.pointerId);
      const svgPt = toSVGCoords(svgRef.current!, e.clientX, e.clientY);

      // Check handles first
      if (selectedId) {
        const sel = elements.find((el) => el.id === selectedId);
        if (sel) {
          const dir = isNearHandle(svgPt, sel);
          if (dir) {
            const bbox = getBBox(sel)!;
            setDrag({
              id: selectedId,
              mode: dir,
              startSvg: svgPt,
              startEl: {
                x: sel.kind === "circle" ? sel.cx - sel.r : sel.kind !== "line" ? sel.x : 0,
                y: sel.kind === "circle" ? sel.cy - sel.r : sel.kind !== "line" ? sel.y : 0,
                w: bbox.w,
                h: bbox.h,
              },
            });
            return;
          }
        }
      }

      const hitId = hitTest(svgPt.x, svgPt.y);
      if (hitId) {
        const el = elements.find((e) => e.id === hitId)!;
        const bbox = getBBox(el)!;
        setSelectedId(hitId);
        setDrag({
          id: hitId,
          mode: "move",
          startSvg: svgPt,
          startEl: {
            x: el.kind === "circle" ? el.cx : (el as IGRectEl | IGTextEl).x,
            y: el.kind === "circle" ? el.cy : (el as IGRectEl | IGTextEl).y,
            w: bbox.w,
            h: bbox.h,
          },
        });
      } else {
        setSelectedId(null);
      }
    },
    [elements, selectedId, textOverlay],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      const svgPt = toSVGCoords(svgRef.current!, e.clientX, e.clientY);

      // Update hover
      if (!drag) {
        setHoverId(hitTest(svgPt.x, svgPt.y));
        return;
      }

      const dx = svgPt.x - drag.startSvg.x;
      const dy = svgPt.y - drag.startSvg.y;

      setElements((els) =>
        els.map((el) => {
          if (el.id !== drag.id) return el;

          if (drag.mode === "move") {
            if (el.kind === "rect") {
              return { ...el, x: drag.startEl.x + dx, y: drag.startEl.y + dy };
            }
            if (el.kind === "text") {
              return { ...el, x: drag.startEl.x + dx, y: drag.startEl.y + dy };
            }
            if (el.kind === "circle") {
              return { ...el, cx: drag.startEl.x + dx, cy: drag.startEl.y + dy };
            }
          }

          // Resize — only for rects
          if (el.kind === "rect") {
            const startX = drag.startEl.x, startY = drag.startEl.y;
            const startW = drag.startEl.w ?? el.w, startH = drag.startEl.h ?? el.h;
            let x = el.x, y = el.y, w = el.w, h = el.h;

            if (drag.mode === "se") {
              w = Math.max(20, startW + dx);
              h = Math.max(20, startH + dy);
            } else if (drag.mode === "sw") {
              x = startX + dx;
              w = Math.max(20, startW - dx);
              h = Math.max(20, startH + dy);
            } else if (drag.mode === "ne") {
              y = startY + dy;
              w = Math.max(20, startW + dx);
              h = Math.max(20, startH - dy);
            } else if (drag.mode === "nw") {
              x = startX + dx;
              y = startY + dy;
              w = Math.max(20, startW - dx);
              h = Math.max(20, startH - dy);
            }

            return { ...el, x, y, w, h };
          }

          return el;
        }),
      );
    },
    [drag],
  );

  const handlePointerUp = useCallback(() => {
    setDrag(null);
  }, []);

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      const svgPt = toSVGCoords(svgRef.current!, e.clientX, e.clientY);
      const hitId = hitTest(svgPt.x, svgPt.y);
      if (!hitId) return;

      const el = elements.find((el) => el.id === hitId);
      if (!el || el.kind !== "text" || !el.textEditable) return;

      setSelectedId(hitId);

      // Calculate overlay position in wrapper-local coords
      const svg = svgRef.current!;
      const wrap = wrapRef.current!;
      const bbox = getBBox(el)!;
      const tl = svgToLocal(svg, wrap, bbox.x, bbox.y);
      const br = svgToLocal(svg, wrap, bbox.x + bbox.w, bbox.y + bbox.h);

      const scaledW = Math.max(160, br.x - tl.x);
      const scaledH = Math.max(40, br.y - tl.y);
      const fs = (scaledH / (el.lines.length + 1));

      setTextOverlay({
        id: hitId,
        text: el.rawText,
        style: {
          left: tl.x,
          top: tl.y,
          width: scaledW,
          minHeight: scaledH,
          fontSize: Math.max(11, Math.min(18, fs * 0.65)),
        },
      });
    },
    [elements],
  );

  function commitEdit() {
    if (!textOverlay) return;
    const text = textOverlay.text.trim();
    setElements((els) =>
      els.map((el) => {
        if (el.id !== textOverlay.id || el.kind !== "text") return el;
        const maxChars =
          el.anchor === "middle" ? 68 : el.fontSize <= 13 ? 65 : 42;
        return { ...el, rawText: text, lines: wrapText(text, maxChars) };
      }),
    );
    setTextOverlay(null);
  }

  function handleExportPNG() {
    const svg = svgRef.current;
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    const vw = doc.vw, vh = doc.vh;
    const scale = 2;
    const canvas = document.createElement("canvas");
    canvas.width = vw * scale;
    canvas.height = vh * scale;
    const ctx = canvas.getContext("2d")!;
    ctx.scale(scale, scale);

    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 0, 0, vw, vh);
      URL.revokeObjectURL(url);
      const a = document.createElement("a");
      a.download = `infographic-${doc.variant.toLowerCase()}.png`;
      a.href = canvas.toDataURL("image/png");
      a.click();
      setExportMsg("Saved!");
      setTimeout(() => setExportMsg(""), 2500);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      setExportMsg("Export failed.");
      setTimeout(() => setExportMsg(""), 2500);
    };
    img.src = url;
  }

  function handleExportSVG() {
    const svg = svgRef.current;
    if (!svg) return;
    const data = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([data], { type: "image/svg+xml" });
    const a = document.createElement("a");
    a.download = `infographic-${doc.variant.toLowerCase()}.svg`;
    a.href = URL.createObjectURL(blob);
    a.click();
    setExportMsg("SVG saved!");
    setTimeout(() => setExportMsg(""), 2500);
  }

  return (
    <div className="ig-editor">
      {/* Toolbar */}
      <div className="ig-editor__toolbar">
        <button type="button" className="ig-editor__btn ig-editor__btn--back" onClick={onBack}>
          ← Back
        </button>
        <div className="ig-editor__toolbar-center">
          <span className="ig-editor__hint">
            Click to select · Drag to move · Double-click text to edit
          </span>
        </div>
        <div className="ig-editor__toolbar-end">
          {exportMsg && <span className="ig-editor__export-msg">{exportMsg}</span>}
          <button
            type="button"
            className="ig-editor__btn ig-editor__btn--secondary"
            onClick={handleExportSVG}
          >
            Export SVG
          </button>
          <button
            type="button"
            className="ig-editor__btn ig-editor__btn--primary"
            onClick={handleExportPNG}
          >
            Export PNG
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div className="ig-editor__canvas-wrap" ref={wrapRef}>
        <InfographicSVG
          ref={svgRef}
          doc={liveDoc}
          selectedId={selectedId}
          hoverId={textOverlay ? null : hoverId}
          className="ig-editor__svg"
          style={{ cursor: drag ? "grabbing" : hoverId ? "pointer" : "default" }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onDoubleClick={handleDoubleClick}
          onPointerLeave={() => setHoverId(null)}
        />

        {/* Text edit overlay */}
        {textOverlay && (
          <textarea
            ref={textareaRef}
            className="ig-editor__text-overlay"
            style={textOverlay.style}
            value={textOverlay.text}
            onChange={(e) =>
              setTextOverlay((prev) => prev && { ...prev, text: e.target.value })
            }
            onBlur={commitEdit}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setTextOverlay(null);
              }
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                commitEdit();
              }
            }}
            placeholder="Enter text…"
          />
        )}
      </div>
    </div>
  );
}
