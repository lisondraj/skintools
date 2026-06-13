import type { Lesion, ScanMode } from "@/lib/skinlog/types";

function makeId() {
  return crypto.randomUUID();
}

export function mockLesionsFromCapture(mode: ScanMode): Lesion[] {
  if (mode === "single") {
    return [
      {
        id: makeId(),
        bodyLocation: "Left forearm",
        description:
          "Placeholder entry — a small, round area noted for personal tracking. Not a diagnosis.",
        attributes: {
          size: "~6 mm",
          color: "Light brown",
          shape: "Round",
          border: "Regular",
          notes: "Replace with OpenAI analysis once OPENAI_API_KEY is set.",
        },
      },
    ];
  }

  return [
    {
      id: makeId(),
      bodyLocation: "Upper back",
      description: "Placeholder full-body finding #1.",
      attributes: {
        size: "~4 mm",
        color: "Tan",
        shape: "Oval",
        border: "Regular",
        notes: "Mock multi-lesion result.",
      },
    },
    {
      id: makeId(),
      bodyLocation: "Right shoulder",
      description: "Placeholder full-body finding #2.",
      attributes: {
        size: "~3 mm",
        color: "Pink-brown",
        shape: "Round",
        border: "Slightly irregular",
        notes: "Mock multi-lesion result.",
      },
    },
  ];
}
