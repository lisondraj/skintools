import {
  buildContextualBackgroundPrompt,
  buildContextualInlineImagePrompt,
  shouldGenerateAiBackground,
  shouldGenerateInlineImage,
} from "./deck-background";
import { generateSlideImage } from "./openai-images";
import type { GeneratedDeckSlide } from "./types";

async function generateWithRetry(
  prompt: string,
  purpose: "image" | "background",
  label: string,
): Promise<string | undefined> {
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      return await generateSlideImage(prompt, purpose, "fast");
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (attempt === 2) {
        console.warn(`[deck-images] ${label} failed after 2 attempts: ${message}`);
      }
    }
  }
  return undefined;
}

export async function generateAssetsForSlide(slide: GeneratedDeckSlide): Promise<{
  imageSrc?: string;
  backgroundImage?: string;
}> {
  const assets: { imageSrc?: string; backgroundImage?: string } = {};
  const label = `"${slide.title}" (${slide.layout})`;
  const tasks: Promise<void>[] = [];

  if (shouldGenerateInlineImage(slide)) {
    const prompt = buildContextualInlineImagePrompt(slide);
    tasks.push(
      generateWithRetry(prompt, "image", `inline image for ${label}`).then((img) => {
        if (img) assets.imageSrc = img;
      }),
    );
  }

  if (shouldGenerateAiBackground(slide)) {
    const prompt = buildContextualBackgroundPrompt(slide);
    if (prompt.trim()) {
      tasks.push(
        generateWithRetry(prompt, "background", `background for ${label}`).then((img) => {
          if (img) assets.backgroundImage = img;
        }),
      );
    }
  }

  await Promise.all(tasks);
  return assets;
}

export async function mapInBatches<T, R>(
  items: T[],
  batchSize: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = [];
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map((item, j) => fn(item, i + j)));
    results.push(...batchResults);
  }
  return results;
}
