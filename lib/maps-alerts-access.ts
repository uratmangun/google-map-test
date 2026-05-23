import "server-only";

import { getAuthDatabase } from "@/lib/auth-db";

const DEFAULT_MASTER_EMAIL = "koisose0@gmail.com";

export function getMasterEmail(): string {
  return (
    process.env.MAPS_ALERTS_MASTER_EMAIL?.trim().toLowerCase() ||
    DEFAULT_MASTER_EMAIL
  );
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isMasterEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return normalizeEmail(email) === getMasterEmail();
}

let schemaReady = false;

function ensureSchema(): void {
  if (schemaReady) return;
  const db = getAuthDatabase();
  db.exec(`
    CREATE TABLE IF NOT EXISTS maps_alerts_allowed_user (
      email TEXT PRIMARY KEY,
      added_by TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  const { count } = db
    .prepare("SELECT COUNT(*) AS count FROM maps_alerts_allowed_user")
    .get() as { count: number };

  if (count === 0) {
    db.prepare(
      "INSERT OR IGNORE INTO maps_alerts_allowed_user (email, added_by) VALUES (?, ?)",
    ).run(getMasterEmail(), "system");
  }

  schemaReady = true;
}

export type AllowedUser = {
  email: string;
  addedBy: string;
  createdAt: string;
};

export function isEmailAllowed(email: string | null | undefined): boolean {
  if (!email) return false;
  ensureSchema();
  const row = getAuthDatabase()
    .prepare("SELECT 1 AS ok FROM maps_alerts_allowed_user WHERE email = ?")
    .get(normalizeEmail(email)) as { ok: number } | undefined;
  return Boolean(row?.ok);
}

export function listAllowedUsers(): AllowedUser[] {
  ensureSchema();
  const rows = getAuthDatabase()
    .prepare(
      "SELECT email, added_by AS addedBy, created_at AS createdAt FROM maps_alerts_allowed_user ORDER BY email",
    )
    .all() as AllowedUser[];
  return rows;
}

export function addAllowedUser(
  email: string,
  addedBy: string,
): AllowedUser | { error: string } {
  if (!isMasterEmail(addedBy)) {
    return { error: "Only the master account can add users." };
  }

  const normalized = normalizeEmail(email);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    return { error: "Enter a valid email address." };
  }

  ensureSchema();
  const db = getAuthDatabase();
  const existing = db
    .prepare("SELECT email FROM maps_alerts_allowed_user WHERE email = ?")
    .get(normalized);
  if (existing) {
    return { error: "This account is already on the allowlist." };
  }

  db.prepare(
    "INSERT INTO maps_alerts_allowed_user (email, added_by) VALUES (?, ?)",
  ).run(normalized, normalizeEmail(addedBy));

  return db
    .prepare(
      "SELECT email, added_by AS addedBy, created_at AS createdAt FROM maps_alerts_allowed_user WHERE email = ?",
    )
    .get(normalized) as AllowedUser;
}

export function removeAllowedUser(
  email: string,
  removedBy: string,
): { ok: true } | { error: string } {
  if (!isMasterEmail(removedBy)) {
    return { error: "Only the master account can remove users." };
  }

  const normalized = normalizeEmail(email);
  if (normalized === getMasterEmail()) {
    return { error: "The master account cannot be removed." };
  }

  ensureSchema();
  const result = getAuthDatabase()
    .prepare("DELETE FROM maps_alerts_allowed_user WHERE email = ?")
    .run(normalized);

  if (result.changes === 0) {
    return { error: "Account not found on the allowlist." };
  }

  return { ok: true };
}
