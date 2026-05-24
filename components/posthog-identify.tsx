"use client";

import { useEffect } from "react";
import posthog from "posthog-js";

import { authClient } from "@/lib/auth-client";

/** Links Better Auth users to PostHog for session replay + analytics. */
export function PostHogIdentify() {
  const { data: session, isPending } = authClient.useSession();

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_POSTHOG_TOKEN || isPending) return;

    const user = session?.user;
    if (user?.id) {
      posthog.identify(user.id, {
        email: user.email ?? undefined,
        name: user.name ?? undefined,
      });
      return;
    }

    posthog.reset();
  }, [session?.user, isPending]);

  return null;
}
