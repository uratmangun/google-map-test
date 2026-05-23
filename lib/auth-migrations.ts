import "server-only";

import { getMigrations } from "better-auth/db/migration";

import { auth } from "@/lib/auth";

let initialization: Promise<void> | null = null;

export async function ensureDatabaseSchema(): Promise<void> {
  initialization ??= (async () => {
    const migrations = await getMigrations(auth.options);
    await migrations.runMigrations();
  })();
  return initialization;
}
