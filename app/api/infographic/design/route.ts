import { NextResponse } from "next/server";
import { generateBothDesignImages } from "@/lib/infographic/openai-images";
import type { DesignReq, DesignRes } from "@/lib/infographic/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as DesignReq;

    if (!body.diagnosis?.trim()) {
      return NextResponse.json(
        { error: "Diagnosis is required." },
        { status: 400 },
      );
    }

    const { imageA, imageB } = await generateBothDesignImages(
      body.diagnosis.trim(),
    );

    return NextResponse.json({ imageA, imageB } satisfies DesignRes);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Design generation failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
