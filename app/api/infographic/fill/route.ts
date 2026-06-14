import { NextResponse } from "next/server";
import { generateInstructions } from "@/lib/infographic/openai";
import type { FillReq, FillRes } from "@/lib/infographic/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as FillReq;

    if (!body.diagnosis?.trim()) {
      return NextResponse.json(
        { error: "Diagnosis is required." },
        { status: 400 },
      );
    }

    const instructions = await generateInstructions(
      body.diagnosis.trim(),
      body.language?.trim() || "English",
    );

    return NextResponse.json({ instructions } satisfies FillRes);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to generate instructions.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
