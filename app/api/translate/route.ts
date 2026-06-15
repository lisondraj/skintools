import { NextResponse } from "next/server";
import { isOpenAiConfigured } from "@/lib/skinlog/env";
import { translateText } from "@/lib/translate/openai-translate";
import type { TranslateRequest } from "@/lib/translate/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ configured: isOpenAiConfigured() });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as TranslateRequest;

    if (!body.text?.trim()) {
      return NextResponse.json({ error: "Text is required." }, { status: 400 });
    }

    if (!body.targetLangLabel?.trim()) {
      return NextResponse.json(
        { error: "Target language is required." },
        { status: 400 },
      );
    }

    const result = await translateText(body.text.trim(), body.targetLangLabel.trim());
    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Translation failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
