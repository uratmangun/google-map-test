import type { MapsServiceId } from "@/lib/maps-free-tier";

/** Billable SKU metadata (free caps from Google Maps Platform pricing). */
export type MapsSkuDefinition = {
  skuKey: string;
  label: string;
  tier: "Essentials" | "Pro" | "Enterprise";
  freeTierLimit: number | null;
  /** USD per 1,000 billable events after free cap (first paid tier). */
  pricePer1000Usd: number;
  /** MCP tools that bill against this SKU when used in this project. */
  mcpTools?: readonly ("search-place" | "show-map-at-coordinates")[];
};

export const SKUS_BY_SERVICE_ID: Record<MapsServiceId, MapsSkuDefinition[]> = {
  "maps-dynamic": [
    {
      skuKey: "dynamic-maps-essentials",
      label: "Dynamic Maps",
      tier: "Essentials",
      freeTierLimit: 10_000,
      pricePer1000Usd: 7.0,
    },
  ],
  "maps-static": [
    {
      skuKey: "static-maps-essentials",
      label: "Static Maps",
      tier: "Essentials",
      freeTierLimit: 10_000,
      pricePer1000Usd: 2.0,
      mcpTools: ["show-map-at-coordinates"],
    },
  ],
  "maps-embed": [
    {
      skuKey: "embed-essentials",
      label: "Maps Embed",
      tier: "Essentials",
      freeTierLimit: null,
      pricePer1000Usd: 0,
    },
  ],
  "maps-android": [
    {
      skuKey: "maps-sdk-android",
      label: "Maps SDK (Android)",
      tier: "Essentials",
      freeTierLimit: null,
      pricePer1000Usd: 0,
    },
  ],
  "maps-ios": [
    {
      skuKey: "maps-sdk-ios",
      label: "Maps SDK (iOS)",
      tier: "Essentials",
      freeTierLimit: null,
      pricePer1000Usd: 0,
    },
  ],
  elevation: [
    {
      skuKey: "elevation-essentials",
      label: "Elevation",
      tier: "Essentials",
      freeTierLimit: 5_000,
      pricePer1000Usd: 5.0,
    },
  ],
  "street-view-static": [
    {
      skuKey: "static-street-view-essentials",
      label: "Static Street View",
      tier: "Essentials",
      freeTierLimit: 10_000,
      pricePer1000Usd: 7.0,
    },
  ],
  "map-tiles": [
    {
      skuKey: "map-tiles-2d-essentials",
      label: "Map Tiles API: 2D Map Tiles",
      tier: "Essentials",
      freeTierLimit: 100_000,
      pricePer1000Usd: 0.6,
    },
  ],
  "aerial-view": [
    {
      skuKey: "aerial-view-essentials",
      label: "Aerial View",
      tier: "Essentials",
      freeTierLimit: 5_000,
      pricePer1000Usd: 16.0,
    },
  ],
  routes: [
    {
      skuKey: "routes-compute-essentials",
      label: "Routes: Compute Routes Essentials",
      tier: "Essentials",
      freeTierLimit: 10_000,
      pricePer1000Usd: 5.0,
    },
    {
      skuKey: "routes-compute-pro",
      label: "Routes: Compute Routes Pro",
      tier: "Pro",
      freeTierLimit: 5_000,
      pricePer1000Usd: 10.0,
    },
  ],
  directions: [
    {
      skuKey: "directions-essentials",
      label: "Directions",
      tier: "Essentials",
      freeTierLimit: 10_000,
      pricePer1000Usd: 5.0,
    },
  ],
  "distance-matrix": [
    {
      skuKey: "distance-matrix-essentials",
      label: "Distance Matrix",
      tier: "Essentials",
      freeTierLimit: 10_000,
      pricePer1000Usd: 5.0,
    },
  ],
  roads: [
    {
      skuKey: "roads-nearest-essentials",
      label: "Roads (nearest / route / speed)",
      tier: "Essentials",
      freeTierLimit: 5_000,
      pricePer1000Usd: 10.0,
    },
  ],
  "route-optimization": [
    {
      skuKey: "route-optimization-pro",
      label: "Route Optimization",
      tier: "Pro",
      freeTierLimit: 5_000,
      pricePer1000Usd: 10.0,
    },
  ],
  places: [
    {
      skuKey: "places-text-search-essentials",
      label: "Places Text Search Essentials",
      tier: "Essentials",
      freeTierLimit: 10_000,
      pricePer1000Usd: 5.0,
      mcpTools: ["search-place"],
    },
    {
      skuKey: "places-text-search-pro",
      label: "Places Text Search Pro",
      tier: "Pro",
      freeTierLimit: 5_000,
      pricePer1000Usd: 32.0,
    },
    {
      skuKey: "places-details-essentials",
      label: "Places Place Details Essentials",
      tier: "Essentials",
      freeTierLimit: 10_000,
      pricePer1000Usd: 5.0,
    },
    {
      skuKey: "places-details-pro",
      label: "Places Place Details Pro",
      tier: "Pro",
      freeTierLimit: 5_000,
      pricePer1000Usd: 17.0,
    },
  ],
  geocoding: [
    {
      skuKey: "geocoding-essentials",
      label: "Geocoding",
      tier: "Essentials",
      freeTierLimit: 10_000,
      pricePer1000Usd: 5.0,
    },
  ],
  geolocation: [
    {
      skuKey: "geolocation-essentials",
      label: "Geolocation",
      tier: "Essentials",
      freeTierLimit: 10_000,
      pricePer1000Usd: 5.0,
    },
  ],
  timezone: [
    {
      skuKey: "timezone-essentials",
      label: "Time Zone",
      tier: "Essentials",
      freeTierLimit: 10_000,
      pricePer1000Usd: 5.0,
    },
  ],
  "address-validation": [
    {
      skuKey: "address-validation-pro",
      label: "Address Validation Pro",
      tier: "Pro",
      freeTierLimit: 5_000,
      pricePer1000Usd: 17.0,
    },
  ],
  "air-quality": [
    {
      skuKey: "air-quality-essentials",
      label: "Air Quality",
      tier: "Essentials",
      freeTierLimit: 10_000,
      pricePer1000Usd: 5.0,
    },
  ],
  weather: [
    {
      skuKey: "weather-essentials",
      label: "Weather",
      tier: "Essentials",
      freeTierLimit: 10_000,
      pricePer1000Usd: 0.15,
    },
  ],
  pollen: [
    {
      skuKey: "pollen-essentials",
      label: "Pollen",
      tier: "Essentials",
      freeTierLimit: 5_000,
      pricePer1000Usd: 10.0,
    },
  ],
  solar: [
    {
      skuKey: "solar-building-insights",
      label: "Solar API Building Insights",
      tier: "Essentials",
      freeTierLimit: 10_000,
      pricePer1000Usd: 10.0,
    },
  ],
};

export type McpMapsTool = "search-place" | "show-map-at-coordinates";

export function getSkusForMcpTool(tool: McpMapsTool): MapsSkuDefinition[] {
  const matches: MapsSkuDefinition[] = [];
  for (const skus of Object.values(SKUS_BY_SERVICE_ID)) {
    for (const sku of skus) {
      if (sku.mcpTools?.includes(tool)) {
        matches.push(sku);
      }
    }
  }
  return matches;
}

export function estimateOverageUsd(used: number, sku: MapsSkuDefinition): number {
  if (sku.freeTierLimit === null || sku.pricePer1000Usd <= 0) {
    return 0;
  }
  const over = Math.max(0, used - sku.freeTierLimit);
  return (over / 1000) * sku.pricePer1000Usd;
}

export function skuUsageFromApiRequests(
  apiRequestCount: number,
  sku: MapsSkuDefinition,
) {
  const limit = sku.freeTierLimit;
  if (limit === null) {
    return {
      skuKey: sku.skuKey,
      label: sku.label,
      tier: sku.tier,
      used: apiRequestCount,
      limit: null as number | null,
      remaining: null as number | null,
      percentUsed: 0,
      unlimited: true as const,
      atLimit: false,
      estimatedOverageUsd: 0,
    };
  }

  const used = apiRequestCount;
  const remaining = Math.max(0, limit - used);
  const percentUsed = limit > 0 ? Math.min(100, (used / limit) * 100) : 0;
  const atLimit = used >= limit;

  return {
    skuKey: sku.skuKey,
    label: sku.label,
    tier: sku.tier,
    used,
    limit,
    remaining,
    percentUsed,
    unlimited: false as const,
    atLimit,
    estimatedOverageUsd: estimateOverageUsd(used, sku),
  };
}
