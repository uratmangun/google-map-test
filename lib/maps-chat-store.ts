import type { UIMessage } from "ai";
import { nanoid } from "nanoid";

import { isToolPart, type MapsToolPart } from "@/lib/maps-chat-shared";

export type ChatThread = {
  id: string;
  title: string;
  messages: UIMessage[];
  updatedAt: number;
};

const THREADS_KEY = "maps-assistant-chats-v1";
const ACTIVE_KEY = "maps-assistant-active-chat-v1";

const TOOL_STATES = new Set<MapsToolPart["state"]>([
  "approval-requested",
  "approval-responded",
  "input-streaming",
  "input-available",
  "output-available",
  "output-error",
  "output-denied",
]);

function isBrowser() {
  return typeof window !== "undefined";
}

function isTextPart(part: unknown): part is { type: "text"; text: string } {
  return (
    typeof part === "object" &&
    part !== null &&
    (part as { type?: string }).type === "text" &&
    typeof (part as { text?: string }).text === "string"
  );
}

function isToolPartType(type: string): boolean {
  return type === "dynamic-tool" || type.startsWith("tool-");
}

function normalizeToolPart(part: Record<string, unknown>): MapsToolPart | null {
  const type = part.type;
  const toolCallId = part.toolCallId;
  const state = part.state;

  if (typeof type !== "string" || !isToolPartType(type)) {
    return null;
  }
  if (typeof toolCallId !== "string" || !toolCallId.trim()) {
    return null;
  }
  if (typeof state !== "string" || !TOOL_STATES.has(state as MapsToolPart["state"])) {
    return null;
  }

  const shared = {
    toolCallId,
    state: state as MapsToolPart["state"],
    ...(part.input !== undefined ? { input: part.input } : {}),
    ...(part.output !== undefined ? { output: part.output } : {}),
    ...(typeof part.errorText === "string" ? { errorText: part.errorText } : {}),
    ...(part.approval !== undefined ? { approval: part.approval } : {}),
    ...(typeof part.providerExecuted === "boolean"
      ? { providerExecuted: part.providerExecuted }
      : {}),
  };

  if (type === "dynamic-tool") {
    if (typeof part.toolName !== "string" || !part.toolName.trim()) {
      return null;
    }
    return {
      type: "dynamic-tool",
      toolName: part.toolName,
      ...shared,
    } as MapsToolPart;
  }

  return {
    type,
    ...shared,
  } as MapsToolPart;
}

function normalizeStoredPart(part: unknown): UIMessage["parts"][number] | null {
  if (isTextPart(part)) {
    const text = part.text.trim();
    return text ? { type: "text", text } : null;
  }

  if (typeof part !== "object" || part === null) {
    return null;
  }

  return normalizeToolPart(part as Record<string, unknown>);
}

/** Restore UIMessage shape after JSON.parse (localStorage round-trip). */
export function normalizeStoredMessages(messages: unknown): UIMessage[] {
  if (!Array.isArray(messages)) {
    return [];
  }

  const normalized: UIMessage[] = [];

  for (const entry of messages) {
    if (typeof entry !== "object" || entry === null) {
      continue;
    }

    const raw = entry as Partial<UIMessage> & { content?: string };
    const role =
      raw.role === "user" || raw.role === "assistant" || raw.role === "system"
        ? raw.role
        : null;

    if (!role) {
      continue;
    }

    let parts = Array.isArray(raw.parts)
      ? raw.parts
          .map(normalizeStoredPart)
          .filter((part): part is UIMessage["parts"][number] => part !== null)
      : [];

    if (parts.length === 0 && typeof raw.content === "string" && raw.content.trim()) {
      parts = [{ type: "text", text: raw.content.trim() }];
    }

    if (parts.length === 0) {
      continue;
    }

    normalized.push({
      id: typeof raw.id === "string" && raw.id.trim() ? raw.id : nanoid(),
      role,
      parts,
      ...(raw.metadata !== undefined ? { metadata: raw.metadata } : {}),
    });
  }

  return normalized;
}

/** Persistable snapshot for localStorage (text + completed tool parts). */
export function sanitizeMessagesForStorage(messages: UIMessage[]): UIMessage[] {
  return normalizeStoredMessages(messages);
}

function normalizeThread(thread: unknown): ChatThread | null {
  if (typeof thread !== "object" || thread === null) {
    return null;
  }

  const raw = thread as Partial<ChatThread>;
  const id = typeof raw.id === "string" ? raw.id.trim() : "";
  if (!id) {
    return null;
  }

  return {
    id,
    title: typeof raw.title === "string" && raw.title.trim() ? raw.title : "New chat",
    messages: normalizeStoredMessages(raw.messages),
    updatedAt:
      typeof raw.updatedAt === "number" && Number.isFinite(raw.updatedAt)
        ? raw.updatedAt
        : Date.now(),
  };
}

export function loadThreads(): ChatThread[] {
  if (!isBrowser()) return [];
  const raw = window.localStorage.getItem(THREADS_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map(normalizeThread)
      .filter((thread): thread is ChatThread => thread !== null);
  } catch {
    return [];
  }
}

export function saveThreads(threads: ChatThread[]) {
  if (!isBrowser()) return;
  window.localStorage.setItem(THREADS_KEY, JSON.stringify(threads));
}

export function loadActiveThreadId(): string | null {
  if (!isBrowser()) return null;
  return window.localStorage.getItem(ACTIVE_KEY);
}

export function saveActiveThreadId(id: string) {
  if (!isBrowser()) return;
  window.localStorage.setItem(ACTIVE_KEY, id);
}

export function createThread(): ChatThread {
  const now = Date.now();
  return {
    id: `chat-${now}-${Math.random().toString(36).slice(2, 9)}`,
    title: "New chat",
    messages: [],
    updatedAt: now,
  };
}

export function deriveTitleFromMessages(messages: UIMessage[]): string {
  const firstUser = messages.find((m) => m.role === "user");
  if (!firstUser) return "New chat";
  const text = firstUser.parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join(" ")
    .trim();
  if (!text) return "New chat";
  return text.length > 42 ? `${text.slice(0, 42)}…` : text;
}

function partSearchText(part: UIMessage["parts"][number]): string {
  if (part.type === "text") {
    return part.text;
  }
  if (isToolPart(part)) {
    const chunks = [getToolNameFromPart(part)];
    if (part.input !== undefined) {
      try {
        chunks.push(JSON.stringify(part.input));
      } catch {
        // ignore circular refs
      }
    }
    if (part.state === "output-available" && part.output !== undefined) {
      try {
        chunks.push(JSON.stringify(part.output));
      } catch {
        // ignore
      }
    }
    if (part.state === "output-error" && part.errorText) {
      chunks.push(part.errorText);
    }
    return chunks.join(" ");
  }
  return "";
}

function getToolNameFromPart(part: MapsToolPart): string {
  return part.type === "dynamic-tool" ? part.toolName : part.type.slice(5);
}

export function messageSearchText(messages: UIMessage[]): string {
  return messages
    .flatMap((m) => m.parts.map(partSearchText))
    .join(" ");
}

export function filterThreads(threads: ChatThread[], query: string): ChatThread[] {
  const q = query.trim().toLowerCase();
  if (!q) {
    return [...threads].sort((a, b) => b.updatedAt - a.updatedAt);
  }
  return threads
    .filter((t) => {
      const haystack = `${t.title} ${messageSearchText(t.messages)}`.toLowerCase();
      return haystack.includes(q);
    })
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

function serializePartForCompare(part: UIMessage["parts"][number]) {
  if (part.type === "text") {
    return { type: part.type, text: part.text };
  }
  if (isToolPart(part)) {
    return {
      type: part.type,
      toolCallId: part.toolCallId,
      state: part.state,
      ...(part.type === "dynamic-tool" ? { toolName: part.toolName } : {}),
      input: part.input ?? null,
      output: part.state === "output-available" ? (part.output ?? null) : null,
      errorText: part.state === "output-error" ? (part.errorText ?? null) : null,
    };
  }
  return { type: part.type };
}

function serializeMessagesForCompare(messages: UIMessage[]): string {
  return JSON.stringify(
    messages.map((m) => ({
      id: m.id,
      role: m.role,
      parts: m.parts.map(serializePartForCompare),
    })),
  );
}

export function serializeMessagesKey(messages: UIMessage[]): string {
  return serializeMessagesForCompare(messages);
}

export function areMessagesEqual(a: UIMessage[], b: UIMessage[]): boolean {
  return serializeMessagesForCompare(a) === serializeMessagesForCompare(b);
}

export function formatThreadMeta(updatedAt: number, messageCount: number): string {
  const diff = Date.now() - updatedAt;
  const countLabel = `${messageCount} message${messageCount === 1 ? "" : "s"}`;
  if (diff < 60_000) return `Just now · ${countLabel}`;
  if (diff < 86_400_000) return `Today · ${countLabel}`;
  if (diff < 172_800_000) return `Yesterday · ${countLabel}`;
  const days = Math.floor(diff / 86_400_000);
  return `${days} days ago · ${countLabel}`;
}
