import { getOpenAiKey, getOpenAiModel } from "@/lib/skinlog/env";

const TITLE_PROMPT = `Look at this clinical close-up skin photo. Write a very short label (2–4 words) describing the main visible finding. Examples: "Scaly oval patch", "Dark macule", "Pink papule cluster". Morphological language only — no diagnosis. Return JSON only: { "title": "..." }`;

export async function titleRemorphImage(photo: string): Promise<string> {
  const apiKey = getOpenAiKey();
  if (!apiKey) {
    throw new Error("OpenAI API key not configured.");
  }

  const model = getOpenAiModel();

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: TITLE_PROMPT },
            { type: "image_url", image_url: { url: photo } },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI title failed (${response.status}): ${errorText}`);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("OpenAI returned an empty title.");

  const parsed = JSON.parse(content) as { title?: string };
  const title = parsed.title?.trim();
  if (!title) throw new Error("OpenAI returned no title.");
  return title;
}
