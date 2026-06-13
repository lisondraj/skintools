import { NextResponse } from "next/server";
import { editLesionImage } from "@/lib/remorph/openai-images";
import type { EditRequest, ImageResponse } from "@/lib/remorph/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as EditRequest;
    const prompt = body.prompt?.trim();
    const image = body.image?.trim();

    if (!image) {
      return NextResponse.json({ error: "Image is required." }, { status: 400 });
    }

    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required." }, { status: 400 });
    }

    const mask = body.mask?.trim() || undefined;
    const result = await editLesionImage(image, prompt, mask);
    return NextResponse.json({ image: result } satisfies ImageResponse);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Edit failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
