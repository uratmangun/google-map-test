"use client";

import { Suspense } from "react";

import { PostHogIdentify } from "@/components/posthog-identify";
import { PostHogPageView } from "@/components/posthog-page-view";

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  if (!process.env.NEXT_PUBLIC_POSTHOG_TOKEN) {
    return children;
  }

  return (
    <>
      <Suspense fallback={null}>
        <PostHogPageView />
      </Suspense>
      <PostHogIdentify />
      {children}
    </>
  );
}
