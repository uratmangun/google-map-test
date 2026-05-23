import { NextResponse } from "next/server";

import { requireApiSession } from "@/lib/api-auth";
import {
  addAllowedUser,
  isEmailAllowed,
  isMasterEmail,
  listAllowedUsers,
  removeAllowedUser,
} from "@/lib/maps-alerts-access";

export const dynamic = "force-dynamic";

export async function GET() {
  const authResult = await requireApiSession();
  if (authResult.errorResponse) {
    return authResult.errorResponse;
  }
  const email = authResult.session.user.email ?? null;
  if (!email) {
    return NextResponse.json({ needsLogin: true }, { status: 401 });
  }
  if (!isEmailAllowed(email)) {
    return NextResponse.json(
      { forbidden: true, error: "Your Google account is not allowed to access quota alerts." },
      { status: 403 },
    );
  }

  const isMaster = isMasterEmail(email);
  return NextResponse.json({
    isMaster,
    masterEmail: process.env.MAPS_ALERTS_MASTER_EMAIL?.trim() || "koisose0@gmail.com",
    members: isMaster ? listAllowedUsers() : [],
  });
}

export async function POST(request: Request) {
  const authResult = await requireApiSession();
  if (authResult.errorResponse) {
    return authResult.errorResponse;
  }
  const email = authResult.session.user.email ?? null;
  if (!email) {
    return NextResponse.json({ needsLogin: true }, { status: 401 });
  }
  if (!isMasterEmail(email)) {
    return NextResponse.json(
      { error: "Only the master account can manage the allowlist." },
      { status: 403 },
    );
  }

  const body = (await request.json().catch(() => ({}))) as { email?: string };
  const target = body.email?.trim();
  if (!target) {
    return NextResponse.json({ error: "Email is required." }, { status: 400 });
  }

  const result = addAllowedUser(target, email);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ member: result, members: listAllowedUsers() });
}

export async function DELETE(request: Request) {
  const authResult = await requireApiSession();
  if (authResult.errorResponse) {
    return authResult.errorResponse;
  }
  const email = authResult.session.user.email ?? null;
  if (!email) {
    return NextResponse.json({ needsLogin: true }, { status: 401 });
  }
  if (!isMasterEmail(email)) {
    return NextResponse.json(
      { error: "Only the master account can manage the allowlist." },
      { status: 403 },
    );
  }

  const target = new URL(request.url).searchParams.get("email")?.trim();
  if (!target) {
    return NextResponse.json({ error: "Email query param is required." }, { status: 400 });
  }

  const result = removeAllowedUser(target, email);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ members: listAllowedUsers() });
}
