import { NextResponse } from "next/server";
import { autofillText } from "@/lib/modules/openai";
import type { AutofillReq, AutofillRes } from "@/lib/modules/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as AutofillReq;

    if (!body.mode) {
      return NextResponse.json({ error: "Mode is required." }, { status: 400 });
    }

    if (body.mode === "generate" && !body.prompt?.trim() && !body.slideContext?.trim()) {
      return NextResponse.json(
        { error: "Provide a prompt or slide context for generation." },
        { status: 400 },
      );
    }

    if (
      (body.mode === "rewrite" ||
        body.mode === "expand" ||
        body.mode === "shorten") &&
      !body.existingText?.trim()
    ) {
      return NextResponse.json(
        { error: "Existing text is required for this mode." },
        { status: 400 },
      );
    }

    const text = await autofillText(body.mode, {
      prompt: body.prompt,
      existingText: body.existingText,
      deckTitle: body.deckTitle,
      slideContext: body.slideContext,
    });

    return NextResponse.json({ text } satisfies AutofillRes);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Autofill failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
