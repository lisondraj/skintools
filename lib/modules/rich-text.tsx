"use client";

import type { TextAlign } from "./types";

type RichTextProps = {
  text: string;
  fontSize: number;
  fontWeight: number;
  color: string;
  align: TextAlign;
  fontFamily: string;
  scale?: number;
};

function parseInline(text: string, keyPrefix: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  const regex = /(\*\*[^*]+\*\*|__[^_]+__|\*[^*]+\*|_[^_]+_)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let partIndex = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }
    const token = match[0];
    if (token.startsWith("**") || token.startsWith("__")) {
      nodes.push(
        <strong key={`${keyPrefix}-b-${partIndex++}`}>{token.slice(2, -2)}</strong>,
      );
    } else {
      nodes.push(<em key={`${keyPrefix}-i-${partIndex++}`}>{token.slice(1, -1)}</em>);
    }
    lastIndex = match.index + token.length;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes.length ? nodes : [text];
}

function parseLine(line: string): { content: string; fontScale: number; indent: number; bullet: boolean } {
  const indentMatch = line.match(/^(\s*)/);
  const indent = Math.floor((indentMatch?.[1]?.length ?? 0) / 2);
  let trimmed = line.trimStart();

  let fontScale = 1;
  if (trimmed.startsWith("# ")) {
    fontScale = 1.45;
    trimmed = trimmed.slice(2);
  } else if (trimmed.startsWith("## ")) {
    fontScale = 1.2;
    trimmed = trimmed.slice(3);
  } else if (trimmed.startsWith("^") && trimmed.endsWith("^") && trimmed.length > 2) {
    fontScale = 0.85;
    trimmed = trimmed.slice(1, -1);
  }

  let bullet = false;
  if (trimmed.startsWith("• ") || trimmed.startsWith("- ")) {
    bullet = true;
    trimmed = trimmed.slice(2);
  }

  return { content: trimmed, fontScale, indent, bullet };
}

export function RichTextContent({
  text,
  fontSize,
  fontWeight,
  color,
  align,
  fontFamily,
  scale = 1,
}: RichTextProps) {
  const lines = text.split("\n");
  const baseSize = fontSize * scale;

  return (
    <div
      className="modules-rich-text"
      style={{
        color,
        fontFamily,
        fontWeight,
        textAlign: align,
        fontSize: baseSize,
      }}
    >
      {lines.map((line, index) => {
        if (!line.trim() && index < lines.length - 1) {
          return <div key={index} className="modules-rich-text__spacer" aria-hidden />;
        }

        const { content, fontScale, indent, bullet } = parseLine(line);
        const lineSize = baseSize * fontScale;
        const padLeft = (indent * 18 + (bullet ? 14 : 0)) * scale;

        return (
          <div
            key={index}
            className={`modules-rich-text__line${bullet ? " modules-rich-text__line--bullet" : ""}`}
            style={{ fontSize: lineSize, paddingLeft: padLeft }}
          >
            {bullet && (
              <span className="modules-rich-text__bullet" aria-hidden>
                •
              </span>
            )}
            <span className="modules-rich-text__content">
              {parseInline(content || "\u00a0", `l${index}`)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export const RICH_TEXT_HINT =
  "**bold** · *italic* · # heading · ## subheading · • bullets · indent with spaces · new lines";
