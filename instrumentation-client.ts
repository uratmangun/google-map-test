import posthog from "posthog-js";

const token = process.env.NEXT_PUBLIC_POSTHOG_TOKEN?.trim();
const apiHost =
  process.env.NEXT_PUBLIC_POSTHOG_HOST?.trim() || "https://us.i.posthog.com";

if (token) {
  posthog.init(token, {
    api_host: apiHost,
    ui_host:
      process.env.NEXT_PUBLIC_POSTHOG_UI_HOST?.trim() || "https://us.posthog.com",
    defaults: "2026-01-30",
    person_profiles: "identified_only",
    capture_pageview: false,
    capture_pageleave: true,
  });
}
