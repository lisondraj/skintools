import { NextResponse } from "next/server";
import { generateSlideImage } from "@/lib/modules/openai-images";
import type { GenerateImageReq, GenerateImageRes } from "@/lib/modules/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as GenerateImageReq;
    if (!body.prompt?.trim()) {
      return NextResponse.json({ error: "Prompt is required." }, { status: 400 });
    }

    const image = await generateSlideImage(
      body.prompt,
      body.purpose ?? "image",
      body.qualityMode ?? "fast",
    );

    return NextResponse.json({ image } satisfies GenerateImageRes);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Image generation failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
