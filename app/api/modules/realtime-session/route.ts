import { NextResponse } from "next/server";
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

    const agentId = getElevenLabsAgentId();
    if (!agentId) {
      return NextResponse.json(
        { error: "ElevenLabs agent not configured. Add ELEVENLABS_AGENT_ID to environment variables." },
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

    // Get a signed URL from ElevenLabs for this session
    const signedUrlRes = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id=${encodeURIComponent(agentId)}`,
      {
        method: "GET",
        headers: { "xi-api-key": apiKey },
      },
    );

    if (!signedUrlRes.ok) {
      const errText = await signedUrlRes.text();
      return NextResponse.json(
        { error: `ElevenLabs signed URL failed (${signedUrlRes.status}): ${errText}` },
        { status: 500 },
      );
    }

    const signedUrlData = (await signedUrlRes.json()) as { signed_url?: string };
    const signedUrl = signedUrlData.signed_url;
    if (!signedUrl) {
      return NextResponse.json(
        { error: "No signed URL returned from ElevenLabs." },
        { status: 500 },
      );
    }

    // Encode persona override so the client can send it after connection
    return NextResponse.json({
      signedUrl,
      voiceId,
      // Pass instructions back so the client can send the override message
      instructions,
    } satisfies RealtimeSessionRes & { instructions: string });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Session creation failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
