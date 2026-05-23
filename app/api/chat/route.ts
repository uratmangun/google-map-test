import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import {
  stepCountIs,
  streamText,
  validateUIMessages,
  type ToolSet,
  type UIMessage,
} from "ai";
import { z } from "zod";

import { requireApiSession } from "@/lib/api-auth";
import { resolveAiProvider, resolveChatModel } from "@/lib/ai-provider";
import { formatProviderError } from "@/lib/chat-errors";
import { getMcpToolsForChat } from "@/lib/mcp-chat-client";
import { toModelMessages } from "@/lib/maps-chat-server";
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

  const validatedMessages = await validateUIMessages<UIMessage>({ messages }).catch(
    () => null,
  );

  if (!validatedMessages || validatedMessages.length === 0) {
    return toValidationResponse("Add a message before sending a chat request.");
  }

  const modelMessages = await toModelMessages(validatedMessages).catch(() => null);

  if (!modelMessages || modelMessages.length === 0) {
    return toValidationResponse("Could not convert chat messages to model input.");
  }

  let mcpClient: Awaited<ReturnType<typeof getMcpToolsForChat>>["client"] | null =
    null;

  let tools: Awaited<ReturnType<typeof getMcpToolsForChat>>["tools"];

  try {
    const mcp = await getMcpToolsForChat();
    mcpClient = mcp.client;
    tools = mcp.tools;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "MCP server unavailable.";
    return Response.json(
      {
        error: `Maps MCP tools are unavailable (${message}). Ensure the app is running and MCP_CHAT_URL is correct.`,
      },
      { status: 503 },
    );
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
    tools: tools as ToolSet,
    stopWhen: stepCountIs(5),
    onFinish: async () => {
      await mcpClient?.close();
    },
  });

  return result.toUIMessageStreamResponse({
    originalMessages: validatedMessages,
    sendStart: true,
    sendFinish: true,
    onError: formatProviderError,
  });
}
