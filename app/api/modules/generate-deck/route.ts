import { NextResponse } from "next/server";
import { buildSlidesFromGenerated } from "@/lib/modules/deck-builder";
import { autofillDeck } from "@/lib/modules/openai";
import { generateSlideImage } from "@/lib/modules/openai-images";
import type { GeneratedDeckSlide, GenerateDeckReq, GenerateDeckRes } from "@/lib/modules/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

async function generateAssetsForSlide(slide: GeneratedDeckSlide): Promise<{
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
        .catch(() => {
          /* skip failed image — slide still renders with text layout */
        }),
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

async function mapInBatches<T, R>(
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

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as GenerateDeckReq;
    if (!body.prompt?.trim()) {
      return NextResponse.json({ error: "Provide a topic for the deck." }, { status: 400 });
    }

    const { deckTitle, slides: specs } = await autofillDeck({
      prompt: body.prompt,
      slideCount: body.slideCount,
      deckTitle: body.deckTitle,
      slideContext: body.slideContext,
      contextImages: body.contextImages,
    });

    const assetsList = await mapInBatches(specs, 2, (slide) => generateAssetsForSlide(slide));
    const slides = buildSlidesFromGenerated(specs, assetsList);

    return NextResponse.json({ deckTitle, slides } satisfies GenerateDeckRes);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Deck generation failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
