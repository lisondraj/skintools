import { NextResponse } from "next/server";
import { generateLesionImage } from "@/lib/remorph/openai-images";
import type { GenerateRequest, ImageResponse } from "@/lib/remorph/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as GenerateRequest;
    const prompt = body.prompt?.trim();

    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required." }, { status: 400 });
    }

    const qualityMode = body.qualityMode === "quality" ? "quality" : "fast";
    const image = await generateLesionImage(prompt, qualityMode);
    return NextResponse.json({ image } satisfies ImageResponse);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Generation failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
