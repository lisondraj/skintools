import { NextResponse } from "next/server";
import { generateContent } from "@/lib/infographic/openai";
import type { GenerateReq, GenerateRes } from "@/lib/infographic/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as GenerateReq;

    if (!body.diagnosis?.trim()) {
      return NextResponse.json(
        { error: "Diagnosis is required." },
        { status: 400 },
      );
    }

    const content = await generateContent(
      body.diagnosis.trim(),
      body.instructions?.trim() ?? "",
      body.language?.trim() || "English",
    );

    return NextResponse.json({ content } satisfies GenerateRes);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Content generation failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
