import "server-only";

import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";

import { getAppUrl, getAuthDatabase, getAuthSecret } from "@/lib/auth-db";

export const auth = betterAuth({
  appName: "Google Map Test",
  baseURL: getAppUrl(),
  secret: getAuthSecret(),
  database: getAuthDatabase(),
  socialProviders: {
    google: {
      clientId:
        process.env.GOOGLE_CLIENT_ID?.trim() ||
        process.env.AUTH_GOOGLE_ID?.trim() ||
        "",
      clientSecret:
        process.env.GOOGLE_CLIENT_SECRET?.trim() ||
        process.env.AUTH_GOOGLE_SECRET?.trim() ||
        "",
      prompt: "select_account",
    },
  },
  plugins: [nextCookies()],
});

export type BetterAuthSession = NonNullable<
  Awaited<ReturnType<typeof auth.api.getSession>>
>;
