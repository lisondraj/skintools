import type { PresetGroup } from "./types";

export const PRESET_GROUPS: PresetGroup[] = [
  {
    id: "theme",
    label: "Theme",
    presets: [
      {
        id: "clinical-blue",
        label: "Clinical blue",
        prompt:
          "Restyle this infographic with a clinical navy and ice-blue color theme. Keep all text, layout, and section structure exactly the same.",
      },
      {
        id: "warm",
        label: "Warm",
        prompt:
          "Restyle this infographic with warm terracotta, cream, and soft orange tones. Keep all text, layout, and section structure exactly the same.",
      },
      {
        id: "high-contrast",
        label: "High contrast",
        prompt:
          "Restyle this infographic with high-contrast black, white, and bold accent colors for maximum readability. Keep all text, layout, and section structure exactly the same.",
      },
      {
        id: "pastel",
        label: "Pastel",
        prompt:
          "Restyle this infographic with soft pastel colors — lavender, mint, peach, and light blue. Keep all text, layout, and section structure exactly the same.",
      },
      {
        id: "dark",
        label: "Dark",
        prompt:
          "Restyle this infographic with a dark mode theme — dark charcoal background, light text, subtle accent colors. Keep all text, layout, and section structure exactly the same.",
      },
    ],
  },
  {
    id: "language",
    label: "Language",
    presets: [
      {
        id: "en",
        label: "English",
        prompt:
          "Translate all text in this infographic to English. Keep the exact layout, colors, and design.",
      },
      {
        id: "es",
        label: "Spanish",
        prompt:
          "Translate all text in this infographic to Spanish. Keep the exact layout, colors, and design.",
      },
      {
        id: "fr",
        label: "French",
        prompt:
          "Translate all text in this infographic to French. Keep the exact layout, colors, and design.",
      },
      {
        id: "zh",
        label: "Mandarin",
        prompt:
          "Translate all text in this infographic to Mandarin Chinese. Keep the exact layout, colors, and design.",
      },
      {
        id: "ar",
        label: "Arabic",
        prompt:
          "Translate all text in this infographic to Arabic. Keep the exact layout, colors, and design.",
      },
      {
        id: "hi",
        label: "Hindi",
        prompt:
          "Translate all text in this infographic to Hindi. Keep the exact layout, colors, and design.",
      },
    ],
  },
  {
    id: "audience",
    label: "Audience",
    presets: [
      {
        id: "children",
        label: "Children",
        prompt:
          "Rewrite all text for a children audience (ages 8–12): simple words, friendly tone, grade 3 reading level. Keep layout and design.",
      },
      {
        id: "teens",
        label: "Teens",
        prompt:
          "Rewrite all text for a teen audience: clear, direct, relatable tone, grade 6 reading level. Keep layout and design.",
      },
      {
        id: "adults",
        label: "Adults",
        prompt:
          "Rewrite all text for a general adult audience: plain language, grade 8 reading level, professional but approachable. Keep layout and design.",
      },
      {
        id: "seniors",
        label: "Seniors",
        prompt:
          "Rewrite all text for a senior audience: larger conceptual clarity, simple sentences, reassuring tone. Keep layout and design.",
      },
      {
        id: "low-literacy",
        label: "Low-literacy",
        prompt:
          "Rewrite all text for low-literacy readers: very short sentences, common words only, grade 4 reading level. Keep layout and design.",
      },
    ],
  },
];
