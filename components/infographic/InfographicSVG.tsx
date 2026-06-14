"use client";

import { forwardRef } from "react";
import type { IGElement, InfographicDoc } from "@/lib/infographic/types";

type Props = React.SVGProps<SVGSVGElement> & {
  doc: InfographicDoc;
  /** Highlights a specific element (editor selection) */
  selectedId?: string | null;
  /** Hover highlight */
  hoverId?: string | null;
};

function renderElement(el: IGElement, key: string) {
  switch (el.kind) {
    case "rect":
      return (
        <rect
          key={key}
          x={el.x}
          y={el.y}
          width={el.w}
          height={el.h}
          fill={el.fill}
          stroke={el.stroke}
          strokeWidth={el.strokeWidth}
          rx={el.rx}
          opacity={el.opacity}
        />
      );

    case "circle":
      return (
        <circle
          key={key}
          cx={el.cx}
          cy={el.cy}
          r={el.r}
          fill={el.fill}
          stroke={el.stroke}
          strokeWidth={el.strokeWidth}
        />
      );

    case "line":
      return (
        <line
          key={key}
          x1={el.x1}
          y1={el.y1}
          x2={el.x2}
          y2={el.y2}
          stroke={el.stroke}
          strokeWidth={el.strokeWidth ?? 1}
        />
      );

    case "text": {
      const dy = el.lineH ?? el.fontSize * 1.4;
      return (
        <text
          key={key}
          x={el.x}
          y={el.y}
          fontSize={el.fontSize}
          fontWeight={el.fontWeight ?? 400}
          fill={el.fill}
          textAnchor={el.anchor ?? "start"}
          fontFamily="system-ui, -apple-system, sans-serif"
          fontStyle={el.fontStyle}
        >
          {el.lines.map((line, i) => (
            <tspan key={i} x={el.x} dy={i === 0 ? 0 : dy}>
              {line}
            </tspan>
          ))}
        </text>
      );
    }

    default:
      return null;
  }
}

export const InfographicSVG = forwardRef<SVGSVGElement, Props>(
  function InfographicSVG({ doc, selectedId, hoverId, ...svgProps }, ref) {
    return (
      <svg
        ref={ref}
        viewBox={`0 0 ${doc.vw} ${doc.vh}`}
        xmlns="http://www.w3.org/2000/svg"
        {...svgProps}
      >
        {doc.elements.map((el) => (
          <g key={el.id} data-id={el.id}>
            {renderElement(el, el.id)}

            {/* Hover highlight */}
            {hoverId === el.id && el.selectable && el.kind !== "line" && (
              <rect
                x={el.kind === "rect" ? el.x - 1 : el.kind === "circle" ? el.cx - el.r - 1 : el.x - 1}
                y={el.kind === "rect" ? el.y - 1 : el.kind === "circle" ? el.cy - el.r - 1 : el.y - (el.fontSize ?? 12)}
                width={el.kind === "rect" ? el.w + 2 : el.kind === "circle" ? el.r * 2 + 2 : 380}
                height={el.kind === "rect" ? el.h + 2 : el.kind === "circle" ? el.r * 2 + 2 : (el.kind === "text" ? el.lines.length * (el.lineH ?? el.fontSize * 1.4) : 20)}
                fill="none"
                stroke="#007AFF"
                strokeWidth="1"
                strokeDasharray="3 2"
                rx={2}
                opacity={0.5}
                pointerEvents="none"
              />
            )}
          </g>
        ))}

        {/* Selection overlay (drawn on top) */}
        {selectedId && (() => {
          const sel = doc.elements.find((e) => e.id === selectedId);
          if (!sel || sel.kind === "line") return null;

          let bx: number, by: number, bw: number, bh: number;
          if (sel.kind === "rect") {
            bx = sel.x; by = sel.y; bw = sel.w; bh = sel.h;
          } else if (sel.kind === "circle") {
            bx = sel.cx - sel.r; by = sel.cy - sel.r; bw = sel.r * 2; bh = sel.r * 2;
          } else {
            const lineH = sel.lineH ?? sel.fontSize * 1.4;
            const h = sel.lines.length * lineH;
            const w = sel.anchor === "middle" ? 380 : 400;
            bx = sel.anchor === "middle" ? sel.x - w / 2 : sel.x;
            by = sel.y - sel.fontSize;
            bw = w; bh = h;
          }

          return (
            <g pointerEvents="none">
              <rect
                x={bx - 3} y={by - 3}
                width={bw + 6} height={bh + 6}
                fill="none" stroke="#007AFF" strokeWidth="1.5"
                strokeDasharray="5 3" rx={3}
              />
              {/* Corner handles */}
              {[
                [bx, by], [bx + bw, by],
                [bx, by + bh], [bx + bw, by + bh],
              ].map(([hx, hy], hi) => (
                <rect key={hi}
                  x={hx - 4} y={hy - 4}
                  width={8} height={8}
                  fill="white" stroke="#007AFF" strokeWidth="1.5"
                  rx={1}
                />
              ))}
            </g>
          );
        })()}
      </svg>
    );
  },
);
