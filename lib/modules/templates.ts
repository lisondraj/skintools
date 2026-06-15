import { createTextElement } from "./elements";
import type { SlideElement } from "./types";
import { MODULES_STAGE_W } from "./types";

export type SlideTemplateId = "title" | "title-body" | "two-column" | "bullets";

export const SLIDE_TEMPLATES: { id: SlideTemplateId; label: string }[] = [
  { id: "title", label: "Title slide" },
  { id: "title-body", label: "Title + body" },
  { id: "two-column", label: "Two columns" },
  { id: "bullets", label: "Bullet points" },
];

export function buildSlideTemplate(id: SlideTemplateId): SlideElement[] {
  switch (id) {
    case "title":
      return [
        createTextElement("Slide title", 1, {
          x: 80,
          y: 200,
          w: MODULES_STAGE_W - 160,
          h: 100,
          fontSize: 44,
          fontWeight: 600,
          align: "center",
        }),
      ];
    case "title-body":
      return [
        createTextElement("Slide title", 1, {
          x: 80,
          y: 60,
          w: MODULES_STAGE_W - 160,
          h: 72,
          fontSize: 36,
          fontWeight: 600,
        }),
        createTextElement("Supporting text goes here. Double-click to edit.", 2, {
          x: 80,
          y: 160,
          w: MODULES_STAGE_W - 160,
          h: 280,
          fontSize: 22,
          fontWeight: 400,
        }),
      ];
    case "two-column":
      return [
        createTextElement("Left column", 1, {
          x: 48,
          y: 80,
          w: 420,
          h: 380,
          fontSize: 20,
        }),
        createTextElement("Right column", 2, {
          x: 492,
          y: 80,
          w: 420,
          h: 380,
          fontSize: 20,
        }),
      ];
    case "bullets":
      return [
        createTextElement("Key points", 1, {
          x: 80,
          y: 48,
          w: MODULES_STAGE_W - 160,
          h: 56,
          fontSize: 32,
          fontWeight: 600,
        }),
        createTextElement(
          "• First point\n• Second point\n• Third point",
          2,
          {
            x: 80,
            y: 130,
            w: MODULES_STAGE_W - 160,
            h: 340,
            fontSize: 22,
            fontWeight: 400,
          },
        ),
      ];
  }
}
