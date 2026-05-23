import { NextResponse } from "next/server";

import { requireApiSession } from "@/lib/api-auth";
import {
  fetchMapsServiceUsage,
  getMapsUsageMeta,
} from "@/lib/gcp-monitoring";
import type { MapsServiceId } from "@/lib/maps-free-tier";
import { MAPS_SERVICES } from "@/lib/maps-free-tier";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const authResult = await requireApiSession();
  if (authResult.errorResponse) {
    return authResult.errorResponse;
  }

  const serviceId = new URL(request.url).searchParams.get("service")?.trim();

  try {
    if (!serviceId) {
      return NextResponse.json(getMapsUsageMeta());
    }

    const valid = MAPS_SERVICES.some((s) => s.id === serviceId);
    if (!valid) {
      return NextResponse.json(
        { error: `Unknown service. Use one of: ${MAPS_SERVICES.map((s) => s.id).join(", ")}` },
        { status: 400 },
      );
    }

    const data = await fetchMapsServiceUsage(serviceId as MapsServiceId);
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
