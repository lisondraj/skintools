"use client";

import type { ShapeElement, ShapeKind } from "@/lib/modules/types";

type Props = {
  element: ShapeElement;
  scale: number;
};

function shapePath(shape: ShapeKind, w: number, h: number): string {
  const cx = w / 2;
  const cy = h / 2;
  const pad = 2;

  switch (shape) {
    case "rectangle":
      return "";
    case "ellipse":
      return "";
    case "triangle":
      return `M ${cx} ${pad} L ${w - pad} ${h - pad} L ${pad} ${h - pad} Z`;
    case "diamond":
      return `M ${cx} ${pad} L ${w - pad} ${cy} L ${cx} ${h - pad} L ${pad} ${cy} Z`;
    case "star": {
      const outer = Math.min(w, h) / 2 - pad;
      const inner = outer * 0.45;
      const points: string[] = [];
      for (let i = 0; i < 10; i++) {
        const angle = (Math.PI / 5) * i - Math.PI / 2;
        const radius = i % 2 === 0 ? outer : inner;
        points.push(`${cx + Math.cos(angle) * radius},${cy + Math.sin(angle) * radius}`);
      }
      return `M ${points.join(" L ")} Z`;
    }
    case "line":
      return "";
    case "arrow":
      return "";
    case "chevron":
      return `M ${pad} ${pad} L ${w - pad} ${cy} L ${pad} ${h - pad} Z`;
  }
}

export function ShapeSvg({ element, scale }: Props) {
  const { w, h, shape, fill, stroke, strokeWidth, opacity } = element;
  const sw = strokeWidth;

  if (shape === "line") {
    return (
      <svg
        className="modules-el__shape-svg"
        width={w * scale}
        height={h * scale}
        viewBox={`0 0 ${w} ${h}`}
        aria-hidden
      >
        <line
          x1={0}
          y1={h / 2}
          x2={w}
          y2={h / 2}
          stroke={stroke}
          strokeWidth={sw}
          opacity={opacity}
          strokeLinecap="round"
        />
      </svg>
    );
  }

  if (shape === "arrow") {
    const mid = h / 2;
    const head = Math.min(w * 0.35, h);
    return (
      <svg
        className="modules-el__shape-svg"
        width={w * scale}
        height={h * scale}
        viewBox={`0 0 ${w} ${h}`}
        aria-hidden
      >
        <polygon
          points={`0,${mid} ${w - head},${mid - head / 2} ${w - head},${mid + head / 2}`}
          fill={fill}
          stroke={stroke}
          strokeWidth={sw}
          opacity={opacity}
          strokeLinejoin="round"
        />
        <rect
          x={0}
          y={mid - sw}
          width={w - head}
          height={sw * 2}
          fill={stroke}
          opacity={opacity}
        />
      </svg>
    );
  }

  const path = shapePath(shape, w, h);

  return (
    <svg
      className="modules-el__shape-svg"
      width={w * scale}
      height={h * scale}
      viewBox={`0 0 ${w} ${h}`}
      aria-hidden
    >
      {shape === "rectangle" && (
        <rect
          x={sw / 2}
          y={sw / 2}
          width={w - sw}
          height={h - sw}
          fill={fill}
          stroke={stroke}
          strokeWidth={sw}
          opacity={opacity}
          rx={4}
        />
      )}
      {shape === "ellipse" && (
        <ellipse
          cx={w / 2}
          cy={h / 2}
          rx={(w - sw) / 2}
          ry={(h - sw) / 2}
          fill={fill}
          stroke={stroke}
          strokeWidth={sw}
          opacity={opacity}
        />
      )}
      {path && (
        <path
          d={path}
          fill={fill}
          stroke={stroke}
          strokeWidth={sw}
          opacity={opacity}
          strokeLinejoin="round"
        />
      )}
    </svg>
  );
}
