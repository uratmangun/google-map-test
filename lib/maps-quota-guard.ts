import { getConfig, getPacificMonthWindow } from "@/lib/maps-free-tier";
import { fetchMonthlyRequestCount } from "@/lib/gcp-monitoring";
import { MAPS_SERVICES, type MapsServiceId } from "@/lib/maps-free-tier";
import {
  getSkusForMcpTool,
  skuUsageFromApiRequests,
  type McpMapsTool,
} from "@/lib/maps-skus";

function isQuotaGuardEnabled() {
  const flag = process.env.MAPS_QUOTA_GUARD?.trim().toLowerCase();
  return flag !== "false" && flag !== "0";
}

function serviceIdForMcpTool(tool: McpMapsTool): MapsServiceId {
  if (tool === "search-place") return "places";
  return "maps-static";
}

/**
 * Blocks MCP calls when Monitoring shows the API at/above free tier for guarded SKUs.
 * Uses shared API request counts (conservative when multiple SKUs share one hostname).
 */
export async function assertMcpQuotaAvailable(tool: McpMapsTool): Promise<void> {
  if (!isQuotaGuardEnabled()) return;

  const skus = getSkusForMcpTool(tool);
  if (skus.length === 0) return;

  const { projectId } = getConfig();
  const window = getPacificMonthWindow();
  const serviceId = serviceIdForMcpTool(tool);
  const serviceDef = MAPS_SERVICES.find((s) => s.id === serviceId);
  if (!serviceDef) return;

  const apiRequestCount = await fetchMonthlyRequestCount(
    projectId,
    serviceDef.service,
    window.periodStart,
    window.periodEnd,
  );

  for (const sku of skus) {
    const usage = skuUsageFromApiRequests(apiRequestCount, sku);
    if (usage.atLimit) {
      throw new Error(
        `Maps free tier exhausted for ${sku.label} (${usage.used.toLocaleString()} / ${usage.limit?.toLocaleString()} requests this month on ${serviceDef.service}). ` +
          `MCP tool "${tool}" was blocked to avoid paid usage. Check /maps-usage or disable with MAPS_QUOTA_GUARD=false.`,
      );
    }
  }
}
