import { NextResponse } from "next/server";

import { requireApiSession } from "@/lib/api-auth";
import { fetchMapsUsage } from "@/lib/gcp-monitoring";

export const dynamic = "force-dynamic";

export async function GET() {
  const authResult = await requireApiSession();
  if (authResult.errorResponse) {
    return authResult.errorResponse;
  }

  try {
    const data = await fetchMapsUsage();
    return NextResponse.json(data);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch Maps usage";
    const needsAuth =
      message.includes("application-default") ||
      message.includes("Could not load the default credentials");

    return NextResponse.json(
      { error: message, needsAuth },
      { status: needsAuth ? 401 : 500 },
    );
  }
}
