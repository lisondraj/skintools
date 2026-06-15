import { NextResponse } from "next/server";
import { getConvaiSignedUrl } from "@/lib/modules/elevenlabs";
import { buildPatientInstructions } from "@/lib/modules/realtime";
import type { RealtimeSessionReq, RealtimeSessionRes } from "@/lib/modules/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function getElevenLabsKey(): string | undefined {
  return process.env["ELEVENLABS_API_KEY"]?.trim() || undefined;
}

function getElevenLabsVoiceId(): string {
  return (
    process.env["ELEVENLABS_VOICE_ID"]?.trim() ||
    "cgSgspJ2msm6clMCkdW9"
  );
}

function getElevenLabsAgentId(): string | undefined {
  return process.env["ELEVENLABS_AGENT_ID"]?.trim() || undefined;
}

export async function POST(request: Request) {
  try {
    const apiKey = getElevenLabsKey();
    if (!apiKey) {
      return NextResponse.json(
        { error: "ElevenLabs API key not configured. Add ELEVENLABS_API_KEY to environment variables." },
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

    const instructions = buildPatientInstructions(body.sim);
    const voiceId = getElevenLabsVoiceId();

    const { signedUrl } = await getConvaiSignedUrl(apiKey, getElevenLabsAgentId());

    return NextResponse.json({
      signedUrl,
      voiceId,
      instructions,
    } satisfies RealtimeSessionRes & { instructions: string });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Session creation failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
