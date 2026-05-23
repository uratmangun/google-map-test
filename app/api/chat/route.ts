import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import {
  convertToModelMessages,
  streamText,
  validateUIMessages,
  type UIMessage,
} from "ai";
import { z } from "zod";

import { requireApiSession } from "@/lib/api-auth";
import { resolveAiProvider, resolveChatModel } from "@/lib/ai-provider";
import { formatProviderError } from "@/lib/chat-errors";
import { DEFAULT_MODEL, MAPS_SYSTEM_PROMPT } from "@/lib/maps-system-prompt";

const requestSchema = z.object({
  messages: z.array(z.unknown()).default([]),
  model: z.string().trim().default(DEFAULT_MODEL),
  baseURL: z.string().trim().default(""),
  apiKey: z.string().trim().optional(),
  systemPrompt: z.string().optional(),
});

function toValidationResponse(message: string, status = 400) {
  return Response.json({ error: message }, { status });
}

export async function POST(request: Request) {
  const authResult = await requireApiSession();
  if (authResult.errorResponse) {
    return authResult.errorResponse;
  }

  const raw = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(raw);

  if (!parsed.success) {
    return toValidationResponse("Invalid chat request payload.");
  }

  const { messages, model, baseURL, apiKey, systemPrompt } = parsed.data;

  const resolved = resolveAiProvider({
    clientBaseURL: baseURL,
    clientApiKey: apiKey,
  });

  if (!resolved.ok) {
    return toValidationResponse(resolved.error);
  }

  const validatedMessages = await validateUIMessages<UIMessage>({ messages }).catch(() => null);

  if (!validatedMessages || validatedMessages.length === 0) {
    return toValidationResponse("Add a message before sending a chat request.");
  }

  const modelMessages = await convertToModelMessages(
    validatedMessages.map((message) => ({
      ...message,
      id: undefined,
    })),
  ).catch(() => null);

  if (!modelMessages || modelMessages.length === 0) {
    return toValidationResponse("Could not convert chat messages to model input.");
  }

  const provider = createOpenAICompatible({
    name: resolved.source === "default" ? "maps-default-provider" : "maps-custom-provider",
    baseURL: resolved.baseURL,
    apiKey: resolved.apiKey,
  });

  const resolvedSystemPrompt = systemPrompt?.trim() || MAPS_SYSTEM_PROMPT;
  const resolvedModel = resolveChatModel(model, resolved);

  const result = streamText({
    model: provider.chatModel(resolvedModel),
    system: resolvedSystemPrompt,
    messages: modelMessages,
  });

  return result.toUIMessageStreamResponse({
    originalMessages: validatedMessages,
    sendStart: true,
    sendFinish: true,
    onError: formatProviderError,
  });
}
