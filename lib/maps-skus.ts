import type { MapsServiceId, McpMapsToolName } from "@/lib/maps-free-tier";

/** Billable SKU metadata for APIs used by `src/tools/`. */
export type MapsSkuDefinition = {
  skuKey: string;
  label: string;
  tier: "Essentials" | "Pro" | "Enterprise";
  freeTierLimit: number | null;
  /** USD per 1,000 billable events after free cap (first paid tier). */
  pricePer1000Usd: number;
  mcpTools?: readonly McpMapsToolName[];
};

export const SKUS_BY_SERVICE_ID: Record<MapsServiceId, MapsSkuDefinition[]> = {
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
      mcpTools: ["show-map-at-coordinates"],
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
  ],
};

export type McpMapsTool = McpMapsToolName;

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
