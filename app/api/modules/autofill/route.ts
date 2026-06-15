import { NextResponse } from "next/server";
import { autofillSlideLayout, autofillText } from "@/lib/modules/openai";
import type { AutofillReq, AutofillRes, SlideLayoutRes } from "@/lib/modules/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const TEXT_MODES_REQUIRING_EXISTING = new Set([
  "rewrite",
  "expand",
  "shorten",
  "edit-selection",
  "simplify",
  "clinical",
  "bullets",
  "grammar",
  "summarize",
]);

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as AutofillReq;

    if (!body.mode) {
      return NextResponse.json({ error: "Mode is required." }, { status: 400 });
    }

    if (body.mode === "slide") {
      if (!body.prompt?.trim()) {
        return NextResponse.json(
          { error: "Provide a topic for slide generation." },
          { status: 400 },
        );
      }
      const layout = await autofillSlideLayout({
        prompt: body.prompt,
        deckTitle: body.deckTitle,
        slideContext: body.slideContext,
        contextImages: body.contextImages,
      });
      return NextResponse.json(layout satisfies SlideLayoutRes);
    }

    if (body.mode === "notes") {
      const text = await autofillText("notes", {
        deckTitle: body.deckTitle,
        slideContext: body.slideContext,
        contextImages: body.contextImages,
      });
      return NextResponse.json({ text } satisfies AutofillRes);
    }

    if (body.mode === "generate" && !body.prompt?.trim() && !body.slideContext?.trim() && !body.contextImages?.length) {
      return NextResponse.json(
        { error: "Provide a prompt or slide context for generation." },
        { status: 400 },
      );
    }

    if (body.mode === "edit-selection") {
      if (!body.existingText?.trim() || !body.selectedText?.trim()) {
        return NextResponse.json(
          { error: "Highlight text to edit and provide the full text box content." },
          { status: 400 },
        );
      }
      if (!body.prompt?.trim()) {
        return NextResponse.json(
          { error: "Describe how to edit the selected text." },
          { status: 400 },
        );
      }
    }

    if (TEXT_MODES_REQUIRING_EXISTING.has(body.mode) && body.mode !== "edit-selection") {
      const target = body.selectedText?.trim() || body.existingText?.trim();
      if (!target) {
        return NextResponse.json(
          { error: "Text is required for this action." },
          { status: 400 },
        );
      }
    }

    const text = await autofillText(body.mode, {
      prompt: body.prompt,
      existingText: body.existingText,
      selectedText: body.selectedText,
      selectionStart: body.selectionStart,
      selectionEnd: body.selectionEnd,
      deckTitle: body.deckTitle,
      slideContext: body.slideContext,
      contextImages: body.contextImages,
    });

    return NextResponse.json({ text } satisfies AutofillRes);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Autofill failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
