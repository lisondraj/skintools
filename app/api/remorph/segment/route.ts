import { NextResponse } from "next/server";
import { segmentRemorphImage } from "@/lib/remorph/openai-segment";
import type { SegmentRequest, SegmentResponse } from "@/lib/remorph/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as SegmentRequest;
    const image = body.image?.trim();

    if (!image?.startsWith("data:image/")) {
      return NextResponse.json(
        { error: "Expected a base64 data URL image (data:image/...)." },
        { status: 400 },
      );
    }

    const result = await segmentRemorphImage(image);
    return NextResponse.json(result satisfies SegmentResponse);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Segmentation failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
