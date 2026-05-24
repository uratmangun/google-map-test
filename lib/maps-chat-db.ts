import "server-only";

import { ensureChatSchema } from "@/lib/maps-chat-migrations";
import { getAuthDatabase } from "@/lib/auth-db";
import {
  dedupeThreads,
  normalizeStoredMessages,
  type ChatThread,
} from "@/lib/maps-chat-store";

export type UserChatState = {
  threads: ChatThread[];
  activeThreadId: string | null;
};

function rowToThread(row: {
  id: string;
  title: string;
  messages_json: string;
  updated_at: number;
}): ChatThread | null {
  try {
    const parsed = JSON.parse(row.messages_json) as unknown;
    const messages = normalizeStoredMessages(parsed);
    return {
      id: row.id,
      title: row.title.trim() || "New chat",
      messages,
      updatedAt: row.updated_at,
    };
  } catch {
    return null;
  }
}

export function loadUserChatState(userId: string): UserChatState {
  ensureChatSchema();
  const db = getAuthDatabase();

  const rows = db
    .prepare(
      `SELECT id, title, messages_json, updated_at
       FROM chat_threads
       WHERE user_id = ?
       ORDER BY updated_at DESC`,
    )
    .all(userId) as Array<{
    id: string;
    title: string;
    messages_json: string;
    updated_at: number;
  }>;

  const threads = dedupeThreads(
    rows
      .map(rowToThread)
      .filter((thread): thread is ChatThread => thread !== null),
  );

  const stateRow = db
    .prepare(`SELECT active_thread_id FROM chat_user_state WHERE user_id = ?`)
    .get(userId) as { active_thread_id: string | null } | undefined;

  let activeThreadId = stateRow?.active_thread_id?.trim() || null;
  if (activeThreadId && !threads.some((t) => t.id === activeThreadId)) {
    activeThreadId = threads[0]?.id ?? null;
  }

  return { threads, activeThreadId };
}

export function saveUserChatState(
  userId: string,
  threads: ChatThread[],
  activeThreadId: string | null,
): UserChatState {
  ensureChatSchema();
  const db = getAuthDatabase();
  const normalized = dedupeThreads(threads);

  let activeId = activeThreadId?.trim() || null;
  if (activeId && !normalized.some((t) => t.id === activeId)) {
    activeId = normalized[0]?.id ?? null;
  }

  const saveAll = db.transaction(() => {
    db.prepare(`DELETE FROM chat_threads WHERE user_id = ?`).run(userId);

    const insert = db.prepare(
      `INSERT INTO chat_threads (id, user_id, title, messages_json, updated_at)
       VALUES (?, ?, ?, ?, ?)`,
    );

    for (const thread of normalized) {
      insert.run(
        thread.id,
        userId,
        thread.title,
        JSON.stringify(thread.messages),
        thread.updatedAt,
      );
    }

    db.prepare(
      `INSERT INTO chat_user_state (user_id, active_thread_id)
       VALUES (?, ?)
       ON CONFLICT(user_id) DO UPDATE SET active_thread_id = excluded.active_thread_id`,
    ).run(userId, activeId);
  });

  saveAll();

  return { threads: normalized, activeThreadId: activeId };
}
