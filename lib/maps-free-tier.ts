/**
 * Maps Platform APIs used by MCP tools in `src/tools/`.
 * Monitoring uses Cloud Monitoring `consumed_api` → resource.label.service.
 * @see https://developers.google.com/maps/billing-and-pricing/pricing
 */
export const MAPS_SERVICE_CATEGORIES = ["maps", "places"] as const;

export type MapsServiceCategory = (typeof MAPS_SERVICE_CATEGORIES)[number];

/** Keep in sync with `src/tools/`. */
export const MCP_MAPS_TOOL_NAMES = [
  "search-place",
  "get-place-detail",
  "show-map-at-coordinates",
  "show-directions",
] as const;

export type McpMapsToolName = (typeof MCP_MAPS_TOOL_NAMES)[number];

/** Keep in sync with `src/tools/` and quota monitoring. */
export const MAPS_SERVICES = [
  {
    id: "maps-embed",
    service: "maps-embed-backend.googleapis.com",
    label: "Maps Embed",
    category: "maps" as const,
    tier: "Essentials" as const,
    freeTierLimit: null,
    mcpTools: ["show-map-at-coordinates", "show-directions"] as const,
  },
  {
    id: "places",
    service: "places.googleapis.com",
    label: "Places API (New)",
    category: "places" as const,
    tier: "Essentials" as const,
    freeTierLimit: 10_000,
    mcpTools: ["search-place", "get-place-detail"] as const,
  },
] as const;

export type MapsServiceId = (typeof MAPS_SERVICES)[number]["id"];

export type MapsServiceDefinition = (typeof MAPS_SERVICES)[number];

const CATEGORY_LABELS: Record<MapsServiceCategory, string> = {
  maps: "Maps",
  places: "Places",
};

export function getCategoryLabel(category: MapsServiceCategory): string {
  return CATEGORY_LABELS[category];
}

export function getServicesByCategory() {
  return MAPS_SERVICE_CATEGORIES.map((category) => ({
    category,
    label: getCategoryLabel(category),
    services: MAPS_SERVICES.filter((s) => s.category === category),
  }));
}

export function resolveFreeTierLimit(
  definition: Pick<MapsServiceDefinition, "freeTierLimit">,
  defaultLimit: number,
): number | null {
  if (definition.freeTierLimit === null) return null;
  return definition.freeTierLimit ?? defaultLimit;
}

export function getConfig() {
  const projectId =
    process.env.GCP_PROJECT_ID?.trim() || "coba-409011";
  const freeTierLimit = Number(
    process.env.MAPS_FREE_TIER_ESSENTIALS_LIMIT ?? "10000",
  );

  return {
    projectId,
    freeTierLimit: Number.isFinite(freeTierLimit) ? freeTierLimit : 10_000,
  };
}

const PT = "America/Los_Angeles";

function zonedParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    hour12: false,
  }).formatToParts(date);
  return {
    year: Number(parts.find((p) => p.type === "year")?.value),
    month: Number(parts.find((p) => p.type === "month")?.value),
    day: Number(parts.find((p) => p.type === "day")?.value),
    hour: Number(parts.find((p) => p.type === "hour")?.value),
  };
}

/** Billing month window: first day 00:00 PT through now (UTC instants). */
export function getPacificMonthWindow(now = new Date()) {
  const { year, month } = zonedParts(now, PT);

  let periodStart = new Date(Date.UTC(year, month - 1, 1, 8, 0, 0));
  for (
    let t = Date.UTC(year, month - 1, 1) - 36 * 3600 * 1000;
    t < Date.UTC(year, month - 1, 2) + 36 * 3600 * 1000;
    t += 3600000
  ) {
    const p = zonedParts(new Date(t), PT);
    if (p.year === year && p.month === month && p.day === 1 && p.hour === 0) {
      periodStart = new Date(t);
      break;
    }
  }

  return {
    periodStart: periodStart.toISOString(),
    periodEnd: now.toISOString(),
    label: `${year}-${String(month).padStart(2, "0")} (Pacific)`,
  };
}

export function usageSummary(used: number, limit: number | null) {
  if (limit === null) {
    return {
      used,
      limit: null as number | null,
      remaining: null as number | null,
      percentUsed: 0,
      unlimited: true as const,
    };
  }
  const remaining = Math.max(0, limit - used);
  const percentUsed = limit > 0 ? Math.min(100, (used / limit) * 100) : 0;
  return {
    used,
    limit,
    remaining,
    percentUsed,
    unlimited: false as const,
  };
}
