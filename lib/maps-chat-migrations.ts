import "server-only";

import { getAuthDatabase } from "@/lib/auth-db";

let initialized = false;

export function ensureChatSchema(): void {
  if (initialized) return;

  const db = getAuthDatabase();
  db.exec(`
    CREATE TABLE IF NOT EXISTS chat_threads (
      id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL DEFAULT 'New chat',
      messages_json TEXT NOT NULL DEFAULT '[]',
      updated_at INTEGER NOT NULL,
      PRIMARY KEY (id, user_id),
      FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_chat_threads_user_updated
      ON chat_threads(user_id, updated_at DESC);

    CREATE TABLE IF NOT EXISTS chat_user_state (
      user_id TEXT PRIMARY KEY,
      active_thread_id TEXT,
      FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE
    );
  `);

  initialized = true;
}
