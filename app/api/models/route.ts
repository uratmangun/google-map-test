import { z } from "zod";

import { requireApiSession } from "@/lib/api-auth";
import { resolveAiProvider } from "@/lib/ai-provider";
import { normalizeModel, type ProxyModelsResponse } from "@/lib/models";

const requestSchema = z.object({
  baseURL: z.string().trim().default(""),
  apiKey: z.string().trim().optional(),
});

export async function POST(request: Request) {
  const authResult = await requireApiSession();
  if (authResult.errorResponse) {
    return authResult.errorResponse;
  }

  const raw = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(raw);

  if (!parsed.success) {
    return Response.json(
      {
        configured: false,
        data: [],
        message: "Invalid model request payload.",
      },
      { status: 200 },
    );
  }

  const { baseURL, apiKey } = parsed.data;

  const resolved = resolveAiProvider({
    clientBaseURL: baseURL,
    clientApiKey: apiKey,
  });

  if (!resolved.ok) {
    return Response.json(
      {
        configured: false,
        data: [],
        message: resolved.error,
      },
      { status: 200 },
    );
  }

  try {
    const response = await fetch(`${resolved.baseURL}/models`, {
      headers: resolved.apiKey
        ? {
            Authorization: `Bearer ${resolved.apiKey}`,
          }
        : undefined,
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`Model fetch failed with status ${response.status}`);
    }

    const payload = (await response.json()) as ProxyModelsResponse;
    const normalized = (payload.data ?? [])
      .map(normalizeModel)
      .filter((model): model is NonNullable<ReturnType<typeof normalizeModel>> => model !== null);

    return Response.json(
      {
        configured: true,
        data: normalized,
        message:
          normalized.length === 0
            ? "No models were returned by the configured OpenAI-compatible API."
            : null,
      },
      { status: 200 },
    );
  } catch {
    return Response.json(
      {
        configured: true,
        data: [],
        message: "Could not load models from the configured OpenAI-compatible API.",
      },
      { status: 200 },
    );
  }
}
