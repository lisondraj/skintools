import { generateSlideImage } from "./openai-images";
import type { GeneratedDeckSlide } from "./types";

export async function generateAssetsForSlide(slide: GeneratedDeckSlide): Promise<{
  imageSrc?: string;
  backgroundImage?: string;
}> {
  const assets: { imageSrc?: string; backgroundImage?: string } = {};
  const tasks: Promise<void>[] = [];

  if (slide.imagePrompt?.trim()) {
    tasks.push(
      generateSlideImage(slide.imagePrompt.trim(), "image", "fast")
        .then((img) => {
          assets.imageSrc = img;
        })
        .catch(() => {}),
    );
  }

  if (slide.backgroundImagePrompt?.trim()) {
    tasks.push(
      generateSlideImage(slide.backgroundImagePrompt.trim(), "background", "fast")
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
