import { NextResponse } from "next/server";
import { buildSlidesFromGenerated } from "@/lib/modules/deck-builder";
import { generateAssetsForSlide, mapInBatches } from "@/lib/modules/deck-images";
import { autofillDeck } from "@/lib/modules/openai";
import type { GenerateDeckReq, GenerateDeckRes } from "@/lib/modules/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

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
