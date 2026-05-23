import "server-only";

import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { auth, type BetterAuthSession } from "@/lib/auth";

export type ApiSession = NonNullable<BetterAuthSession>;

export async function requireApiSession():
  | { session: ApiSession; errorResponse: null }
  | { session: null; errorResponse: NextResponse } {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user) {
    return {
      session: null,
      errorResponse: NextResponse.json(
        {
          needsLogin: true,
          error: "Sign in with Google to continue.",
        },
        { status: 401 },
      ),
    };
  }

  return { session, errorResponse: null };
}
