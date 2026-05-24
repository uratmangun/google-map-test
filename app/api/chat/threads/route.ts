import { NextResponse } from "next/server";

import { requireApiSession } from "@/lib/api-auth";
import { loadUserChatState, saveUserChatState } from "@/lib/maps-chat-db";
import {
  dedupeThreads,
  normalizeStoredMessages,
  type ChatThread,
} from "@/lib/maps-chat-store";

function parseThread(entry: unknown): ChatThread | null {
  if (typeof entry !== "object" || entry === null) {
    return null;
  }
  const raw = entry as Partial<ChatThread>;
  const id = typeof raw.id === "string" ? raw.id.trim() : "";
  if (!id) {
    return null;
  }
  const messages = normalizeStoredMessages(raw.messages);
  return {
    id,
    title: typeof raw.title === "string" && raw.title.trim() ? raw.title : "New chat",
    messages,
    updatedAt:
      typeof raw.updatedAt === "number" && Number.isFinite(raw.updatedAt)
        ? raw.updatedAt
        : Date.now(),
  };
}

export async function GET() {
  const { session, errorResponse } = await requireApiSession();
  if (errorResponse) {
    return errorResponse;
  }

  const state = loadUserChatState(session.user.id);
  return NextResponse.json(state);
}

export async function PUT(request: Request) {
  const { session, errorResponse } = await requireApiSession();
  if (errorResponse) {
    return errorResponse;
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const raw = body as { threads?: unknown; activeThreadId?: unknown };
  if (!Array.isArray(raw.threads)) {
    return NextResponse.json({ error: "threads must be an array" }, { status: 400 });
  }

  const threads = dedupeThreads(
    raw.threads
      .map(parseThread)
      .filter((thread): thread is ChatThread => thread !== null),
  );

  const activeThreadId =
    typeof raw.activeThreadId === "string" ? raw.activeThreadId.trim() : null;

  const state = saveUserChatState(session.user.id, threads, activeThreadId);
  return NextResponse.json(state);
}
