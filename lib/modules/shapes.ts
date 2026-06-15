import type { ShapeKind } from "./types";

export type ShapeOption = {
  id: ShapeKind;
  label: string;
};

export const SHAPE_OPTIONS: ShapeOption[] = [
  { id: "rectangle", label: "Rectangle" },
  { id: "ellipse", label: "Ellipse" },
  { id: "triangle", label: "Triangle" },
  { id: "diamond", label: "Diamond" },
  { id: "star", label: "Star" },
  { id: "line", label: "Line" },
  { id: "arrow", label: "Arrow" },
  { id: "chevron", label: "Chevron" },
];

export const DEFAULT_SHAPE: ShapeKind = "rectangle";
