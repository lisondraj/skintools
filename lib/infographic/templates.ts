import { wrapText } from "./utils";
import type {
  IGElement,
  IGRectEl,
  IGTextEl,
  IGCircleEl,
  IGLineEl,
  InfographicContent,
  InfographicDoc,
} from "./types";

// ── Shared constants ─────────────────────────────────────────────
const VW = 600;
const VH = 920;

const TYPE_ACCENT: Record<string, string> = {
  info: "#2D7EC5",
  tip: "#16A085",
  warning: "#D97706",
  note: "#7C3AED",
};

// ── Helper builders ──────────────────────────────────────────────
function rect(id: string, x: number, y: number, w: number, h: number, fill: string, extra: Partial<IGRectEl> = {}): IGRectEl {
  return { kind: "rect", id, x, y, w, h, fill, ...extra };
}

function text(id: string, x: number, y: number, raw: string, maxChars: number, fontSize: number, fill: string, extra: Partial<IGTextEl> = {}): IGTextEl {
  return {
    kind: "text", id, x, y,
    rawText: raw, lines: wrapText(raw, maxChars),
    fontSize, fill,
    ...extra,
  };
}

function circle(id: string, cx: number, cy: number, r: number, fill: string, extra: Partial<IGCircleEl> = {}): IGCircleEl {
  return { kind: "circle", id, cx, cy, r, fill, ...extra };
}

function line(id: string, x1: number, y1: number, x2: number, y2: number, stroke: string, sw = 1): IGLineEl {
  return { kind: "line", id, x1, y1, x2, y2, stroke, strokeWidth: sw };
}

// ── Template A — "Clinical" ──────────────────────────────────────
// Deep navy header · fact pills · left-accent section cards · amber warning
//
// Layout (VH=920):
//   0–116   Header (navy)
// 116–164   Key facts strip (ice blue)
// 164–764   4 × sections (150 px each)
// 764–836   Warning box (amber, optional spacer)
// 836–920   Footer (gray)
export function buildTemplateA(content: InfographicContent): InfographicDoc {
  const els: IGElement[] = [];
  let n = 0;
  const id = () => `a-${n++}`;

  // ── Background
  els.push(rect(id(), 0, 0, VW, VH, "#FFFFFF"));

  // ── Header (0–116)
  els.push(rect(id(), 0, 0, VW, 116, "#1B3F6A"));
  els.push(rect(id(), 0, 0, VW, 5, "#2D7EC5")); // top accent stripe
  // Decorative circles
  els.push(circle(id(), 555, 32, 52, "rgba(255,255,255,0.05)"));
  els.push(circle(id(), 44, 96, 38, "rgba(255,255,255,0.05)"));
  // Plus / cross icon (top-right area)
  els.push(rect(id(), 536, 14, 4, 20, "rgba(255,255,255,0.18)", { rx: 2 }));
  els.push(rect(id(), 526, 22, 20, 4, "rgba(255,255,255,0.18)", { rx: 2 }));

  const titleLines = wrapText(content.title, 32);
  const titleY = titleLines.length > 1 ? 46 : 52;
  els.push({
    kind: "text", id: id(),
    x: 300, y: titleY,
    rawText: content.title, lines: titleLines,
    fontSize: 22, fontWeight: 700, fill: "#FFFFFF", anchor: "middle",
    lineH: 28, selectable: true, textEditable: true,
  });
  els.push(text(id(), 300, 88, content.subtitle, 52, 12, "#8BB8D8", {
    anchor: "middle", selectable: true, textEditable: true,
  }));

  // ── Key facts strip (116–164)
  els.push(rect(id(), 0, 116, VW, 48, "#EBF4FF"));

  const facts = content.keyFacts.slice(0, 3);
  const pillW = 158, pillH = 30;
  const pillTotal = facts.length * pillW + (facts.length - 1) * 14;
  const pillX0 = Math.max(16, (VW - pillTotal) / 2);
  facts.forEach((fact, i) => {
    const px = pillX0 + i * (pillW + 14);
    const py = 125;
    els.push(rect(id(), px, py, pillW, pillH, "#FFFFFF", {
      rx: 15, stroke: "#2D7EC5", strokeWidth: 1, selectable: true,
    }));
    const truncated = fact.length > 25 ? fact.slice(0, 25) + "…" : fact;
    els.push(text(id(), px + pillW / 2, py + pillH / 2 + 4.5, truncated, 28, 11, "#1B3F6A", {
      anchor: "middle", fontWeight: 600, selectable: true, textEditable: true,
    }));
  });

  // ── Sections (164–764, 4 × 150 px)
  const SY = [164, 314, 464, 614];
  const SH = 150;
  const SBG = ["#FFFFFF", "#F9FAFB", "#FFFFFF", "#F9FAFB"];

  content.sections.slice(0, 4).forEach((sec, i) => {
    const sy = SY[i];
    const accent = TYPE_ACCENT[sec.type] || "#2D7EC5";
    els.push(rect(id(), 0, sy, VW, SH, SBG[i]));
    els.push(line(id(), 0, sy, VW, sy, "#E5E7EB"));
    els.push(rect(id(), 0, sy, 5, SH, accent)); // left accent bar
    // Type badge dot
    els.push(circle(id(), 22, sy + 23, 5, accent));
    els.push(text(id(), 32, sy + 27, sec.type.toUpperCase(), 8, 9, accent, {
      fontWeight: 700,
    }));
    // Heading
    els.push(text(id(), 20, sy + 48, sec.heading, 40, 14.5, "#111827", {
      fontWeight: 700, selectable: true, textEditable: true,
    }));
    // Body
    els.push({
      kind: "text", id: id(),
      x: 20, y: sy + 72,
      rawText: sec.body,
      lines: wrapText(sec.body, 65).slice(0, 4),
      fontSize: 12.5, fill: "#374151", lineH: 19,
      selectable: true, textEditable: true,
    });
  });

  // Bottom section divider
  els.push(line(id(), 0, 764, VW, 764, "#E5E7EB"));

  // ── Warning box (764–836)
  if (content.warning) {
    els.push(rect(id(), 20, 772, VW - 40, 54, "#FFFBEB", {
      rx: 8, stroke: "#D97706", strokeWidth: 1.5, selectable: true,
    }));
    els.push(text(id(), 44, 800, "⚠", 2, 14, "#D97706"));
    els.push(text(id(), 62, 800, content.warning, 62, 11.5, "#92400E", {
      selectable: true, textEditable: true,
    }));
  }

  // ── Footer (836–920)
  els.push(rect(id(), 0, 836, VW, VH - 836, "#F3F4F6"));
  els.push(line(id(), 0, 836, VW, 836, "#D1D5DB"));
  els.push(text(id(), 300, 869, content.footer, 72, 10.5, "#9CA3AF", {
    anchor: "middle", selectable: true, textEditable: true,
  }));
  els.push(text(id(), 300, 901, "Patient Education Resource", 30, 9, "#D1D5DB", {
    anchor: "middle",
  }));

  return { variant: "A", vw: VW, vh: VH, elements: els };
}

// ── Template B — "Modern" ────────────────────────────────────────
// Teal accent · large title · numbered circles · clean separators
//
// Layout (VH=920):
//    0–6    Teal bar
//    6–138  Header (white)
//  138–192  Key facts chips
//  192–800  4 × sections (152 px each)
//  800–858  Warning card
//  858–920  Footer
export function buildTemplateB(content: InfographicContent): InfographicDoc {
  const els: IGElement[] = [];
  let n = 0;
  const id = () => `b-${n++}`;

  // ── Background
  els.push(rect(id(), 0, 0, VW, VH, "#FFFFFF"));

  // ── Top teal bar
  els.push(rect(id(), 0, 0, VW, 6, "#2FA89C"));
  // Teal right accent strip
  els.push(rect(id(), VW - 6, 0, 6, 192, "#2FA89C", { opacity: 0.25 }));

  // ── Header (6–138)
  // Watermark-style large circle
  els.push(circle(id(), VW - 60, 75, 90, "#F0FBF9"));

  // "PATIENT GUIDE" label
  els.push(text(id(), 40, 38, "PATIENT GUIDE", 16, 10, "#2FA89C", {
    fontWeight: 700,
    fontStyle: "normal",
  }));
  // Large diagnosis title
  const titleLines = wrapText(content.title, 30);
  els.push({
    kind: "text", id: id(),
    x: 40, y: titleLines.length > 1 ? 68 : 78,
    rawText: content.title, lines: titleLines,
    fontSize: 26, fontWeight: 800, fill: "#111827",
    lineH: 34, selectable: true, textEditable: true,
  });
  // Subtitle
  const subtitleY = titleLines.length > 1 ? 110 : 112;
  els.push(text(id(), 40, subtitleY, content.subtitle, 52, 13, "#6B7280", {
    selectable: true, textEditable: true,
  }));
  // Thin accent underline under title area
  els.push(rect(id(), 40, 128, 80, 3, "#2FA89C", { rx: 2 }));

  // ── Key facts chips (138–192)
  const facts = content.keyFacts.slice(0, 3);
  const chipW = 158, chipH = 32;
  const chipTotal = facts.length * chipW + (facts.length - 1) * 12;
  const chipX0 = Math.max(16, (VW - chipTotal) / 2);
  facts.forEach((fact, i) => {
    const cx = chipX0 + i * (chipW + 12);
    const cy = 148;
    els.push(rect(id(), cx, cy, chipW, chipH, "#F0FBF9", {
      rx: 8, stroke: "#2FA89C", strokeWidth: 1, selectable: true,
    }));
    const truncated = fact.length > 25 ? fact.slice(0, 25) + "…" : fact;
    els.push(text(id(), cx + chipW / 2, cy + chipH / 2 + 4.5, truncated, 27, 11, "#0F6B61", {
      anchor: "middle", fontWeight: 600, selectable: true, textEditable: true,
    }));
  });

  // Dividers around key facts
  els.push(line(id(), 40, 138, VW - 40, 138, "#E5E7EB"));
  els.push(line(id(), 40, 192, VW - 40, 192, "#E5E7EB"));

  // ── Sections (192–800, 4 × 152 px)
  const SY = [196, 348, 500, 652];
  const SH = 150;

  content.sections.slice(0, 4).forEach((sec, i) => {
    const sy = SY[i];
    const accent = TYPE_ACCENT[sec.type] || "#2FA89C";
    // Section number circle
    els.push(circle(id(), 52, sy + 26, 17, accent));
    els.push(text(id(), 52, sy + 31, String(i + 1), 2, 13, "#FFFFFF", {
      anchor: "middle", fontWeight: 700,
    }));
    // Heading
    els.push(text(id(), 82, sy + 30, sec.heading, 38, 14.5, "#111827", {
      fontWeight: 700, selectable: true, textEditable: true,
    }));
    // Body
    els.push({
      kind: "text", id: id(),
      x: 82, y: sy + 54,
      rawText: sec.body,
      lines: wrapText(sec.body, 60).slice(0, 4),
      fontSize: 12.5, fill: "#4B5563", lineH: 19,
      selectable: true, textEditable: true,
    });
    // Section divider
    if (i < 3) {
      els.push(line(id(), 40, sy + SH, VW - 40, sy + SH, "#F0F0F0", 1));
    }
  });

  // Bottom divider
  els.push(line(id(), 40, 800, VW - 40, 800, "#E5E7EB"));

  // ── Warning card (800–858)
  if (content.warning) {
    els.push(rect(id(), 20, 808, VW - 40, 42, "#FFFBEB", {
      rx: 6, stroke: "#D97706", strokeWidth: 1.5, selectable: true,
    }));
    els.push(text(id(), 42, 832, "⚠", 2, 13, "#D97706"));
    els.push(text(id(), 60, 832, content.warning, 64, 11.5, "#92400E", {
      selectable: true, textEditable: true,
    }));
  }

  // ── Footer (858–920)
  els.push(line(id(), 0, 858, VW, 858, "#F0F0F0"));
  els.push(text(id(), 300, 881, content.footer, 72, 10.5, "#9CA3AF", {
    anchor: "middle", selectable: true, textEditable: true,
  }));
  els.push(text(id(), 300, 906, "Made with Infographic Builder", 35, 9, "#D1D5DB", {
    anchor: "middle",
  }));

  return { variant: "B", vw: VW, vh: VH, elements: els };
}
