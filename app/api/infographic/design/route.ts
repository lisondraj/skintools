import { NextResponse } from "next/server";
import { generateBothDesignImages } from "@/lib/infographic/openai-images";
import type { DesignReq, DesignRes } from "@/lib/infographic/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as DesignReq;

    if (!body.content?.title?.trim()) {
      return NextResponse.json(
        { error: "Content is required." },
        { status: 400 },
      );
    }

    if (!body.language?.trim()) {
      return NextResponse.json(
        { error: "Language is required." },
        { status: 400 },
      );
    }

    const { imageA, imageB } = await generateBothDesignImages(
      body.content,
      body.language.trim(),
    );

    return NextResponse.json({ imageA, imageB } satisfies DesignRes);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Design generation failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
