import { NextResponse } from "next/server";
import { editDesignImage } from "@/lib/infographic/openai-images";
import type { EditReq, EditRes } from "@/lib/infographic/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as EditReq;

    if (!body.image?.trim()) {
      return NextResponse.json(
        { error: "Image is required." },
        { status: 400 },
      );
    }

    if (!body.prompt?.trim()) {
      return NextResponse.json(
        { error: "Prompt is required." },
        { status: 400 },
      );
    }

    const image = await editDesignImage(body.image, body.prompt.trim());

    return NextResponse.json({ image } satisfies EditRes);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Image edit failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
