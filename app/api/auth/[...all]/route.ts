import { toNextJsHandler } from "better-auth/next-js";

import { auth } from "@/lib/auth";
import { ensureDatabaseSchema } from "@/lib/auth-migrations";

export const runtime = "nodejs";

const handler = toNextJsHandler(async (request: Request) => {
  await ensureDatabaseSchema();
  return auth.handler(request);
});

export const GET = handler.GET;
export const POST = handler.POST;
export const PATCH = handler.PATCH;
export const PUT = handler.PUT;
export const DELETE = handler.DELETE;
