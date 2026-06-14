import { NextResponse } from "next/server";
import { getOpenAiKey } from "@/lib/skinlog/env";
import {
  buildPatientInstructions,
  getDefaultRealtimeVoice,
  getRealtimeModel,
} from "@/lib/modules/realtime";
import type { RealtimeSessionReq, RealtimeSessionRes } from "@/lib/modules/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const apiKey = getOpenAiKey();
    if (!apiKey) {
      return NextResponse.json(
        { error: "OpenAI API key not configured." },
        { status: 500 },
      );
    }

    const body = (await request.json()) as RealtimeSessionReq;
    if (!body.sim?.persona?.trim() || !body.sim?.scenario?.trim()) {
      return NextResponse.json(
        { error: "Persona and scenario are required." },
        { status: 400 },
      );
    }

    const model = getRealtimeModel();
    const voice = body.sim.voice?.trim() || getDefaultRealtimeVoice();
    const instructions = buildPatientInstructions(body.sim);

    const response = await fetch("https://api.openai.com/v1/realtime/client_secrets", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        expires_after: {
          anchor: "created_at",
          seconds: 600,
        },
        session: {
          type: "realtime",
          model,
          instructions,
          audio: {
            input: {
              transcription: { model: "whisper-1" },
            },
            output: { voice },
          },
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `Realtime session failed (${response.status}): ${errorText}` },
        { status: 500 },
      );
    }

    const data = (await response.json()) as {
      value?: string;
      expires_at?: number;
      session?: { model?: string };
    };

    const clientSecret = data.value;
    if (!clientSecret) {
      return NextResponse.json(
        { error: "No client secret returned from OpenAI." },
        { status: 500 },
      );
    }

    return NextResponse.json({
      clientSecret,
      model: data.session?.model ?? model,
      expiresAt: data.expires_at,
    } satisfies RealtimeSessionRes);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Realtime session failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
