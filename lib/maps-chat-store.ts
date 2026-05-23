import type { UIMessage } from "ai";
import { nanoid } from "nanoid";

export type ChatThread = {
  id: string;
  title: string;
  messages: UIMessage[];
  updatedAt: number;
};

const THREADS_KEY = "maps-assistant-chats-v1";
const ACTIVE_KEY = "maps-assistant-active-chat-v1";

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

    let parts = Array.isArray(raw.parts) ? raw.parts.filter(isTextPart) : [];

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
    });
  }

  return normalized;
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

export function messageSearchText(messages: UIMessage[]): string {
  return messages
    .flatMap((m) =>
      m.parts
        .filter((p): p is { type: "text"; text: string } => p.type === "text")
        .map((p) => p.text),
    )
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

function serializeMessagesForCompare(messages: UIMessage[]): string {
  return JSON.stringify(
    messages.map((m) => ({
      id: m.id,
      role: m.role,
      parts: m.parts
        .filter((p): p is { type: "text"; text: string } => p.type === "text")
        .map((p) => ({ type: p.type, text: p.text })),
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
