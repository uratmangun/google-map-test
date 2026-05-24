import type { ChatThread } from "@/lib/maps-chat-store";

export type RemoteChatState = {
  threads: ChatThread[];
  activeThreadId: string | null;
};

export async function fetchRemoteChatState(): Promise<RemoteChatState> {
  const response = await fetch("/api/chat/threads", { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Failed to load chats (${response.status})`);
  }
  return (await response.json()) as RemoteChatState;
}

export async function saveRemoteChatState(
  threads: ChatThread[],
  activeThreadId: string,
): Promise<RemoteChatState> {
  const response = await fetch("/api/chat/threads", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ threads, activeThreadId }),
  });
  if (!response.ok) {
    throw new Error(`Failed to save chats (${response.status})`);
  }
  return (await response.json()) as RemoteChatState;
}
