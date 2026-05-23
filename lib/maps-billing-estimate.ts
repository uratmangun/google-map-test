import {
  getConfig,
  getPacificMonthWindow,
  MAPS_SERVICES,
  type MapsServiceCategory,
} from "@/lib/maps-free-tier";
import { fetchMonthlyRequestCount } from "@/lib/gcp-monitoring";
import { SKUS_BY_SERVICE_ID, skuUsageFromApiRequests } from "@/lib/maps-skus";
import type { MapsServiceId } from "@/lib/maps-free-tier";

export type CategoryBillingEstimate = {
  category: MapsServiceCategory;
  periodLabel: string;
  /** Sum of estimated overage USD across SKUs in this category (not official invoice). */
  estimatedOverageUsd: number;
  breakdown: Array<{
    serviceId: string;
    serviceLabel: string;
    skuKey: string;
    skuLabel: string;
    apiRequestCount: number;
    used: number;
    limit: number | null;
    atLimit: boolean;
    estimatedOverageUsd: number;
  }>;
  note: string;
};

export async function fetchCategoryBillingEstimate(
  category: MapsServiceCategory,
): Promise<CategoryBillingEstimate> {
  const { projectId } = getConfig();
  const window = getPacificMonthWindow();
  const services = MAPS_SERVICES.filter((s) => s.category === category);

  const counts = await Promise.all(
    services.map(async (s) => ({
      serviceId: s.id,
      serviceLabel: s.label,
      monitoringService: s.service,
      count: await fetchMonthlyRequestCount(
        projectId,
        s.service,
        window.periodStart,
        window.periodEnd,
      ),
    })),
  );

  const breakdown: CategoryBillingEstimate["breakdown"] = [];
  let estimatedOverageUsd = 0;

  for (const row of counts) {
    const skus = SKUS_BY_SERVICE_ID[row.serviceId as MapsServiceId];
    let serviceOverage = 0;
    for (const sku of skus) {
      const usage = skuUsageFromApiRequests(row.count, sku);
      serviceOverage = Math.max(serviceOverage, usage.estimatedOverageUsd);
      breakdown.push({
        serviceId: row.serviceId,
        serviceLabel: row.serviceLabel,
        skuKey: sku.skuKey,
        skuLabel: sku.label,
        apiRequestCount: row.count,
        used: usage.used,
        limit: usage.limit,
        atLimit: usage.atLimit,
        estimatedOverageUsd: usage.estimatedOverageUsd,
      });
    }
    estimatedOverageUsd += serviceOverage;
  }

  return {
    category,
    periodLabel: window.label,
    estimatedOverageUsd: Math.round(estimatedOverageUsd * 100) / 100,
    breakdown,
    note:
      "Estimated from Cloud Monitoring API request counts × list pricing after free caps. Not an official invoice; per-SKU usage on your bill may differ. See Cloud Billing Reports for actual costs.",
  };
}
