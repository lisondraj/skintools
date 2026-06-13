import { analyzeSkinPhoto } from "@/lib/skinlog/openai-analyze";
import type { AnalyzeRequest } from "@/lib/skinlog/types";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as AnalyzeRequest;

    if (!body.photo?.startsWith("data:image/")) {
      return NextResponse.json(
        { error: "Expected a base64 data URL photo (data:image/...)." },
        { status: 400 },
      );
    }

    if (body.mode !== "single" && body.mode !== "full-body") {
      return NextResponse.json(
        { error: 'mode must be "single" or "full-body".' },
        { status: 400 },
      );
    }

    const result = await analyzeSkinPhoto(body.photo, body.mode);
    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected server error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
