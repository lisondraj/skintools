import {
  buildContextualBackgroundPrompt,
  buildContextualInlineImagePrompt,
  shouldGenerateAiBackground,
  shouldGenerateInlineImage,
} from "./deck-background";
import { generateSlideImage } from "./openai-images";
import type { GeneratedDeckSlide } from "./types";

export async function generateAssetsForSlide(slide: GeneratedDeckSlide): Promise<{
  imageSrc?: string;
  backgroundImage?: string;
}> {
  const assets: { imageSrc?: string; backgroundImage?: string } = {};
  const tasks: Promise<void>[] = [];

  if (shouldGenerateInlineImage(slide)) {
    const prompt = buildContextualInlineImagePrompt(slide);
    tasks.push(
      generateSlideImage(prompt, "image", "fast")
        .then((img) => {
          assets.imageSrc = img;
        })
        .catch(() => {}),
    );
  }

  if (shouldGenerateAiBackground(slide)) {
    const prompt = buildContextualBackgroundPrompt(slide);
    tasks.push(
      generateSlideImage(prompt, "background", "fast")
        .then((img) => {
          assets.backgroundImage = img;
        })
        .catch(() => {}),
    );
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
