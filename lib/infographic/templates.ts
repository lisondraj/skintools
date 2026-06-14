import { wrapText } from "./utils";
import type {
  IGElement,
  IGRectEl,
  IGTextEl,
  InfographicContent,
  InfographicDoc,
} from "./types";

// 2:3 canvas matching gpt-image-2 output (1024×1536)
const VW = 600;
const VH = 900;

const TYPE_ACCENT: Record<string, string> = {
  info: "#2D7EC5",
  tip: "#16A085",
  warning: "#D97706",
  note: "#7C3AED",
};

function plate(
  id: string,
  x: number,
  y: number,
  w: number,
  h: number,
  opacity = 0.82,
): IGRectEl {
  return {
    kind: "rect",
    id,
    x,
    y,
    w,
    h,
    fill: "#FFFFFF",
    opacity,
    rx: 6,
  };
}

function text(
  id: string,
  x: number,
  y: number,
  raw: string,
  maxChars: number,
  fontSize: number,
  fill: string,
  extra: Partial<IGTextEl> = {},
): IGTextEl {
  return {
    kind: "text",
    id,
    x,
    y,
    rawText: raw,
    lines: wrapText(raw, maxChars),
    fontSize,
    fill,
    ...extra,
  };
}

/** Shared text overlay layout — coordinates align with zoned image prompts */
function buildTextOverlays(
  content: InfographicContent,
  variant: "A" | "B",
): IGElement[] {
  const els: IGElement[] = [];
  let n = 0;
  const id = () => `${variant.toLowerCase()}-${n++}`;

  const isA = variant === "A";
  const titleFill = isA ? "#1B3F6A" : "#111827";
  const subtitleFill = isA ? "#4B6A8A" : "#6B7280";
  const bodyFill = "#374151";

  // ── Header zone (y 0–120)
  els.push(plate(id(), 24, 18, VW - 48, 96, isA ? 0.88 : 0.85));

  const titleLines = wrapText(content.title, isA ? 32 : 30);
  const titleY = titleLines.length > 1 ? 52 : 58;
  els.push({
    kind: "text",
    id: id(),
    x: 300,
    y: titleY,
    rawText: content.title,
    lines: titleLines,
    fontSize: isA ? 22 : 24,
    fontWeight: 700,
    fill: titleFill,
    anchor: "middle",
    lineH: isA ? 28 : 30,
    selectable: true,
    textEditable: true,
  });
  els.push(
    text(id(), 300, 92, content.subtitle, 52, 12, subtitleFill, {
      anchor: "middle",
      selectable: true,
      textEditable: true,
    }),
  );

  // ── Key facts strip (y 120–165)
  const facts = content.keyFacts.slice(0, 3);
  const pillW = 158;
  const pillH = 32;
  const gap = 12;
  const pillTotal = facts.length * pillW + (facts.length - 1) * gap;
  const pillX0 = Math.max(20, (VW - pillTotal) / 2);

  facts.forEach((fact, i) => {
    const px = pillX0 + i * (pillW + gap);
    const py = 128;
    els.push(plate(id(), px, py, pillW, pillH, 0.9));
    const truncated = fact.length > 25 ? `${fact.slice(0, 25)}…` : fact;
    els.push(
      text(id(), px + pillW / 2, py + pillH / 2 + 4, truncated, 28, 11, titleFill, {
        anchor: "middle",
        fontWeight: 600,
        selectable: true,
        textEditable: true,
      }),
    );
  });

  // ── Four content sections (y 170–720, ~137 px each)
  const SY = [172, 309, 446, 583];
  const SH = 132;

  content.sections.slice(0, 4).forEach((sec, i) => {
    const sy = SY[i];
    const accent = TYPE_ACCENT[sec.type] || (isA ? "#2D7EC5" : "#2FA89C");

    els.push(plate(id(), 20, sy, VW - 40, SH, 0.86));

    els.push(
      text(id(), 32, sy + 22, sec.type.toUpperCase(), 8, 9, accent, {
        fontWeight: 700,
      }),
    );
    els.push(
      text(id(), 32, sy + 40, sec.heading, 40, 14, titleFill, {
        fontWeight: 700,
        selectable: true,
        textEditable: true,
      }),
    );
    els.push({
      kind: "text",
      id: id(),
      x: 32,
      y: sy + 62,
      rawText: sec.body,
      lines: wrapText(sec.body, 62).slice(0, 4),
      fontSize: 12,
      fill: bodyFill,
      lineH: 18,
      selectable: true,
      textEditable: true,
    });
  });

  // ── Warning band (y 725–790)
  if (content.warning) {
    els.push(plate(id(), 20, 732, VW - 40, 48, 0.92));
    els.push(text(id(), 36, 758, "⚠", 2, 13, "#D97706"));
    els.push(
      text(id(), 54, 758, content.warning, 62, 11.5, "#92400E", {
        selectable: true,
        textEditable: true,
      }),
    );
  }

  // ── Footer (y 800–890)
  els.push(plate(id(), 20, 810, VW - 40, 56, 0.8));
  els.push(
    text(id(), 300, 838, content.footer, 72, 10, "#6B7280", {
      anchor: "middle",
      selectable: true,
      textEditable: true,
    }),
  );

  return els;
}

export function buildTemplateA(
  content: InfographicContent,
  backgroundImage: string,
): InfographicDoc {
  return {
    variant: "A",
    vw: VW,
    vh: VH,
    backgroundImage,
    elements: buildTextOverlays(content, "A"),
  };
}

export function buildTemplateB(
  content: InfographicContent,
  backgroundImage: string,
): InfographicDoc {
  return {
    variant: "B",
    vw: VW,
    vh: VH,
    backgroundImage,
    elements: buildTextOverlays(content, "B"),
  };
}
