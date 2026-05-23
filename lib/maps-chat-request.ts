import { DEFAULT_MODEL } from "@/lib/maps-system-prompt";

export type MapsChatRequestSettings = {
  baseURL: string;
  apiKey: string;
  model: string;
  systemPrompt: string;
};

/** Per-request body for /api/chat — avoids stale values from useChat transport. */
export function buildChatRequestBody(settings: MapsChatRequestSettings) {
  return {
    baseURL: settings.baseURL,
    apiKey: settings.apiKey,
    model: settings.model.trim() || DEFAULT_MODEL,
    systemPrompt: settings.systemPrompt,
  };
}
