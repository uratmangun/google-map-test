import { NextResponse } from "next/server";

import { requireApiSession } from "@/lib/api-auth";
import { fetchCategoryBillingEstimate } from "@/lib/maps-billing-estimate";
import {
  MAPS_SERVICE_CATEGORIES,
  type MapsServiceCategory,
} from "@/lib/maps-free-tier";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const authResult = await requireApiSession();
  if (authResult.errorResponse) {
    return authResult.errorResponse;
  }

  const category = new URL(request.url).searchParams
    .get("category")
    ?.trim() as MapsServiceCategory | undefined;

  if (!category || !MAPS_SERVICE_CATEGORIES.includes(category)) {
    return NextResponse.json(
      {
        error: `Unknown category. Use one of: ${MAPS_SERVICE_CATEGORIES.join(", ")}`,
      },
      { status: 400 },
    );
  }

  try {
    const data = await fetchCategoryBillingEstimate(category);
    return NextResponse.json(data);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to estimate billing";
    const needsAuth =
      message.includes("application-default") ||
      message.includes("Could not load the default credentials");

    return NextResponse.json(
      { error: message, needsAuth },
      { status: needsAuth ? 401 : 500 },
    );
  }
}
