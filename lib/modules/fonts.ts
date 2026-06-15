export interface SlideFontStyle {
  id: string;
  label: string;
  cssFamily: string;
}

/** Ten clean presentation font styles for slide text. */
export const SLIDE_FONT_STYLES: SlideFontStyle[] = [
  {
    id: "inter",
    label: "Inter",
    cssFamily: "var(--font-inter), system-ui, sans-serif",
  },
  {
    id: "dm-sans",
    label: "DM Sans",
    cssFamily: "var(--font-dm-sans), system-ui, sans-serif",
  },
  {
    id: "outfit",
    label: "Outfit",
    cssFamily: "var(--font-outfit), system-ui, sans-serif",
  },
  {
    id: "ibm-plex",
    label: "IBM Plex",
    cssFamily: "var(--font-ibm-plex), system-ui, sans-serif",
  },
  {
    id: "source-serif",
    label: "Source Serif",
    cssFamily: "var(--font-source-serif), Georgia, serif",
  },
  {
    id: "lora",
    label: "Lora",
    cssFamily: "var(--font-lora), Georgia, serif",
  },
  {
    id: "merriweather",
    label: "Merriweather",
    cssFamily: "var(--font-merriweather), Georgia, serif",
  },
  {
    id: "playfair",
    label: "Playfair",
    cssFamily: "var(--font-playfair), Georgia, serif",
  },
  {
    id: "geist-mono",
    label: "Geist Mono",
    cssFamily: "var(--font-geist-mono), ui-monospace, monospace",
  },
  {
    id: "georgia",
    label: "Georgia",
    cssFamily: "Georgia, 'Times New Roman', serif",
  },
];

export const DEFAULT_FONT_STYLE = "inter";

export function getFontFamily(styleId?: string): string {
  const style =
    SLIDE_FONT_STYLES.find((s) => s.id === styleId) ??
    SLIDE_FONT_STYLES[0];
  return style.cssFamily;
}

export function getFontStyleLabel(styleId?: string): string {
  return SLIDE_FONT_STYLES.find((s) => s.id === styleId)?.label ?? "Inter";
}
