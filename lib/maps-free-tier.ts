/**
 * Google Maps Platform APIs with Essentials (or documented) monthly free usage.
 * Monitoring uses Cloud Monitoring `consumed_api` → resource.label.service.
 * @see https://developers.google.com/maps/billing-and-pricing/pricing
 */
export const MAPS_SERVICE_CATEGORIES = [
  "maps",
  "routes",
  "places",
  "environment",
] as const;

export type MapsServiceCategory = (typeof MAPS_SERVICE_CATEGORIES)[number];

export const MAPS_SERVICES = [
  // —— Maps (loads & tiles) ——
  {
    id: "maps-dynamic",
    service: "maps-backend.googleapis.com",
    label: "Dynamic Maps",
    category: "maps" as const,
    tier: "Essentials" as const,
    freeTierLimit: 10_000,
  },
  {
    id: "maps-static",
    service: "static-maps-backend.googleapis.com",
    label: "Static Maps",
    category: "maps" as const,
    tier: "Essentials" as const,
    freeTierLimit: 10_000,
  },
  {
    id: "maps-embed",
    service: "maps-embed-backend.googleapis.com",
    label: "Maps Embed",
    category: "maps" as const,
    tier: "Essentials" as const,
    freeTierLimit: null,
  },
  {
    id: "maps-android",
    service: "maps-android-backend.googleapis.com",
    label: "Maps SDK (Android)",
    category: "maps" as const,
    tier: "Essentials" as const,
    freeTierLimit: null,
  },
  {
    id: "maps-ios",
    service: "maps-ios-backend.googleapis.com",
    label: "Maps SDK (iOS)",
    category: "maps" as const,
    tier: "Essentials" as const,
    freeTierLimit: null,
  },
  {
    id: "elevation",
    service: "elevation-backend.googleapis.com",
    label: "Elevation",
    category: "maps" as const,
    tier: "Essentials" as const,
    freeTierLimit: 5_000,
  },
  {
    id: "street-view-static",
    service: "street-view-image-backend.googleapis.com",
    label: "Static Street View",
    category: "maps" as const,
    tier: "Essentials" as const,
    freeTierLimit: 10_000,
  },
  {
    id: "map-tiles",
    service: "tile.googleapis.com",
    label: "Map Tiles (2D)",
    category: "maps" as const,
    tier: "Essentials" as const,
    freeTierLimit: 100_000,
  },
  {
    id: "aerial-view",
    service: "aerialview.googleapis.com",
    label: "Aerial View",
    category: "maps" as const,
    tier: "Essentials" as const,
    freeTierLimit: 5_000,
  },
  // —— Routes ——
  {
    id: "routes",
    service: "routes.googleapis.com",
    label: "Routes API",
    category: "routes" as const,
    tier: "Essentials" as const,
    freeTierLimit: 10_000,
  },
  {
    id: "directions",
    service: "directions-backend.googleapis.com",
    label: "Directions (legacy)",
    category: "routes" as const,
    tier: "Essentials" as const,
    freeTierLimit: 10_000,
  },
  {
    id: "distance-matrix",
    service: "distance-matrix-backend.googleapis.com",
    label: "Distance Matrix (legacy)",
    category: "routes" as const,
    tier: "Essentials" as const,
    freeTierLimit: 10_000,
  },
  {
    id: "roads",
    service: "roads.googleapis.com",
    label: "Roads API",
    category: "routes" as const,
    tier: "Essentials" as const,
    freeTierLimit: 5_000,
  },
  {
    id: "route-optimization",
    service: "routeoptimization.googleapis.com",
    label: "Route Optimization",
    category: "routes" as const,
    tier: "Pro" as const,
    freeTierLimit: 5_000,
  },
  // —— Places & location ——
  {
    id: "places",
    service: "places.googleapis.com",
    label: "Places API (New)",
    category: "places" as const,
    tier: "Essentials" as const,
    freeTierLimit: 10_000,
  },
  {
    id: "geocoding",
    service: "geocoding-backend.googleapis.com",
    label: "Geocoding",
    category: "places" as const,
    tier: "Essentials" as const,
    freeTierLimit: 10_000,
  },
  {
    id: "geolocation",
    service: "geolocation.googleapis.com",
    label: "Geolocation",
    category: "places" as const,
    tier: "Essentials" as const,
    freeTierLimit: 10_000,
  },
  {
    id: "timezone",
    service: "timezone-backend.googleapis.com",
    label: "Time Zone",
    category: "places" as const,
    tier: "Essentials" as const,
    freeTierLimit: 10_000,
  },
  {
    id: "address-validation",
    service: "addressvalidation.googleapis.com",
    label: "Address Validation",
    category: "places" as const,
    tier: "Pro" as const,
    freeTierLimit: 5_000,
  },
  // —— Environment ——
  {
    id: "air-quality",
    service: "airquality.googleapis.com",
    label: "Air Quality",
    category: "environment" as const,
    tier: "Essentials" as const,
    freeTierLimit: 10_000,
  },
  {
    id: "weather",
    service: "weather.googleapis.com",
    label: "Weather",
    category: "environment" as const,
    tier: "Essentials" as const,
    freeTierLimit: 10_000,
  },
  {
    id: "pollen",
    service: "pollen.googleapis.com",
    label: "Pollen",
    category: "environment" as const,
    tier: "Essentials" as const,
    freeTierLimit: 5_000,
  },
  {
    id: "solar",
    service: "solar.googleapis.com",
    label: "Solar API",
    category: "environment" as const,
    tier: "Essentials" as const,
    freeTierLimit: 10_000,
  },
] as const;

export type MapsServiceId = (typeof MAPS_SERVICES)[number]["id"];

export type MapsServiceDefinition = (typeof MAPS_SERVICES)[number];

const CATEGORY_LABELS: Record<MapsServiceCategory, string> = {
  maps: "Maps",
  routes: "Routes",
  places: "Places & location",
  environment: "Environment",
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
