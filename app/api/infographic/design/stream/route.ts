import { streamDesignImage } from "@/lib/infographic/openai-images";
import type { InfographicContent, InfographicQualityMode } from "@/lib/infographic/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface StreamDesignReq {
  content: InfographicContent;
  language: string;
  variant: "A" | "B";
  qualityMode?: InfographicQualityMode;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as StreamDesignReq;

    if (!body.content?.title?.trim()) {
      return new Response(JSON.stringify({ error: "Content is required." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!body.variant || (body.variant !== "A" && body.variant !== "B")) {
      return new Response(JSON.stringify({ error: "Variant A or B is required." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const qualityMode = body.qualityMode === "standard" ? "standard" : "fast";
    const upstream = await streamDesignImage(
      body.variant,
      body.content,
      body.language?.trim() || "English",
      qualityMode,
    );

    return new Response(upstream.body, {
      status: 200,
      headers: {
        "Content-Type":
          upstream.headers.get("Content-Type") ?? "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Stream generation failed.";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
