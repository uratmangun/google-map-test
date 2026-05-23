import { NextResponse } from "next/server";

import { requireApiSession } from "@/lib/api-auth";
import { ensureQuotaAlert, getAlertsStatus } from "@/lib/gcp-monitoring";
import {
  isEmailAllowed,
  isMasterEmail,
  listAllowedUsers,
  normalizeEmail,
} from "@/lib/maps-alerts-access";

export const dynamic = "force-dynamic";

function emailErrorResponse(email: string | null, status: number) {
  if (!email) {
    return NextResponse.json(
      { needsLogin: true, error: "Sign in with Google to access quota alerts." },
      { status: 401 },
    );
  }
  return NextResponse.json(
    {
      forbidden: true,
      error:
        "Your Google account is not on the allowlist. Contact the master account to request access.",
    },
    { status },
  );
}

export async function GET() {
  const authResult = await requireApiSession();
  if (authResult.errorResponse) {
    return authResult.errorResponse;
  }
  const email = authResult.session.user.email ?? null;

  if (!email) {
    return emailErrorResponse(null, 401);
  }
  if (!isEmailAllowed(email)) {
    return emailErrorResponse(email, 403);
  }

  try {
    const data = await getAlertsStatus();
    const isMaster = isMasterEmail(email);
    return NextResponse.json({
      ...data,
      isMaster,
      userEmail: email,
      members: isMaster ? listAllowedUsers() : undefined,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch alert status";
    const needsAuth =
      message.includes("application-default") ||
      message.includes("Could not load the default credentials");

    return NextResponse.json(
      { error: message, needsAuth, isMaster: isMasterEmail(email), userEmail: email },
      { status: needsAuth ? 401 : 500 },
    );
  }
}

export async function POST(request: Request) {
  const authResult = await requireApiSession();
  if (authResult.errorResponse) {
    return authResult.errorResponse;
  }
  const email = authResult.session.user.email ?? null;

  if (!email) {
    return emailErrorResponse(null, 401);
  }
  if (!isEmailAllowed(email)) {
    return emailErrorResponse(email, 403);
  }

  const body = (await request.json().catch(() => ({}))) as {
    notificationEmail?: string;
  };
  const notificationEmail =
    body.notificationEmail?.trim() || email;

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(notificationEmail)) {
    return NextResponse.json(
      { error: "Enter a valid notification email address." },
      { status: 400 },
    );
  }

  try {
    const result = await ensureQuotaAlert(normalizeEmail(notificationEmail));
    const status = await getAlertsStatus();
    return NextResponse.json({
      ...result,
      ...status,
      notificationEmail: normalizeEmail(notificationEmail),
      isMaster: isMasterEmail(email),
      userEmail: email,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create alert";
    const needsAuth =
      message.includes("application-default") ||
      message.includes("Could not load the default credentials");

    return NextResponse.json(
      { error: message, needsAuth },
      { status: needsAuth ? 401 : 500 },
    );
  }
}
