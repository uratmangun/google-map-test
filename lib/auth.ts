import "server-only";

import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";

import { getAppUrl, getAuthDatabase, getAuthSecret } from "@/lib/auth-db";

const appUrl = getAppUrl();

export const auth = betterAuth({
  appName: "Google Map Test",
  baseURL: appUrl,
  trustedOrigins: [appUrl, "https://maps.uratmangun.ovh"],
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
