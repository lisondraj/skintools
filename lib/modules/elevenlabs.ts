type ElevenLabsErrorDetail = {
  type?: string;
  code?: string;
  message?: string;
};

type AgentsListResponse = {
  agents?: Array<{ agent_id: string; name: string }>;
};

type SignedUrlResponse = {
  signed_url?: string;
};

export async function listConvaiAgents(
  apiKey: string,
): Promise<Array<{ agent_id: string; name: string }>> {
  const res = await fetch(
    "https://api.elevenlabs.io/v1/convai/agents?page_size=10&archived=false",
    { headers: { "xi-api-key": apiKey } },
  );
  if (!res.ok) return [];
  const data = (await res.json()) as AgentsListResponse;
  return data.agents ?? [];
}

async function fetchSignedUrl(apiKey: string, agentId: string): Promise<Response> {
  return fetch(
    `https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id=${encodeURIComponent(agentId)}`,
    { method: "GET", headers: { "xi-api-key": apiKey } },
  );
}

export function parseElevenLabsError(raw: string, status: number): string {
  try {
    const parsed = JSON.parse(raw) as { detail?: ElevenLabsErrorDetail | string };
    const detail = parsed.detail;
    const detailObj = typeof detail === "object" && detail !== null ? detail : undefined;
    const message =
      typeof detail === "string"
        ? detail
        : detailObj?.message ?? detailObj?.code ?? raw;

    if (status === 404 || detailObj?.code === "agent_not_found") {
      return [
        "ElevenLabs agent not found.",
        "ELEVENLABS_AGENT_ID must be your Conversational AI agent ID — not ELEVENLABS_VOICE_ID.",
        "Create an agent at elevenlabs.io/app/conversational-ai and paste its agent ID in Vercel.",
        message ? `(${message})` : "",
      ]
        .filter(Boolean)
        .join(" ");
    }

    return message || raw;
  } catch {
    return raw || `ElevenLabs request failed (${status}).`;
  }
}

/**
 * Resolve a ConvAI signed URL. Uses ELEVENLABS_AGENT_ID when valid; otherwise
 * falls back to the first agent in the account.
 */
export async function getConvaiSignedUrl(
  apiKey: string,
  configuredAgentId?: string,
): Promise<{ signedUrl: string; agentId: string }> {
  const tryAgent = async (agentId: string) => {
    const res = await fetchSignedUrl(apiKey, agentId);
    if (!res.ok) {
      const errText = await res.text();
      return { ok: false as const, status: res.status, errText, agentId };
    }
    const data = (await res.json()) as SignedUrlResponse;
    if (!data.signed_url) {
      return {
        ok: false as const,
        status: 500,
        errText: "No signed URL returned from ElevenLabs.",
        agentId,
      };
    }
    return { ok: true as const, signedUrl: data.signed_url, agentId };
  };

  if (configuredAgentId) {
    const result = await tryAgent(configuredAgentId);
    if (result.ok) return { signedUrl: result.signedUrl, agentId: result.agentId };

    const isAgentMissing =
      result.status === 404 ||
      result.errText.includes("agent_not_found") ||
      result.errText.includes("not found");

    if (!isAgentMissing) {
      throw new Error(parseElevenLabsError(result.errText, result.status));
    }
  }

  const agents = await listConvaiAgents(apiKey);
  if (agents.length === 0) {
    throw new Error(
      configuredAgentId
        ? parseElevenLabsError(
            `{"detail":{"code":"agent_not_found","message":"Agent with ID '${configuredAgentId}' not found."}}`,
            404,
          )
        : "No ElevenLabs Conversational AI agents found. Create one at elevenlabs.io/app/conversational-ai and set ELEVENLABS_AGENT_ID.",
    );
  }

  const fallback = agents[0];
  const fallbackResult = await tryAgent(fallback.agent_id);
  if (fallbackResult.ok) {
    return { signedUrl: fallbackResult.signedUrl, agentId: fallbackResult.agentId };
  }

  throw new Error(parseElevenLabsError(fallbackResult.errText, fallbackResult.status));
}
