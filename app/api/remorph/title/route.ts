import { NextResponse } from "next/server";
import { titleRemorphImage } from "@/lib/remorph/openai-title";
import type { TitleRequest, TitleResponse } from "@/lib/remorph/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as TitleRequest;
    const image = body.image?.trim();

    if (!image?.startsWith("data:image/")) {
      return NextResponse.json(
        { error: "Expected a base64 data URL image (data:image/...)." },
        { status: 400 },
      );
    }

    const title = await titleRemorphImage(image);
    return NextResponse.json({ title } satisfies TitleResponse);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Title generation failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
