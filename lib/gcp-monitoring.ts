import {
  getConfig,
  getPacificMonthWindow,
  MAPS_SERVICES,
  resolveFreeTierLimit,
  usageSummary,
  type MapsServiceId,
} from "@/lib/maps-free-tier";
import {
  SKUS_BY_SERVICE_ID,
  skuUsageFromApiRequests,
} from "@/lib/maps-skus";
import { monitoringFetch } from "@/lib/gcp-auth";

type TimeSeriesPoint = {
  value?: { int64Value?: string; doubleValue?: number };
};

type TimeSeries = {
  metric?: { labels?: Record<string, string> };
  resource?: { labels?: Record<string, string> };
  points?: TimeSeriesPoint[];
};

async function monitoringJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await monitoringFetch(path, init);
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Monitoring API ${res.status}: ${body.slice(0, 500)}`);
  }
  return res.json() as Promise<T>;
}

function sumPoints(series: TimeSeries[]): number {
  let total = 0;
  for (const s of series) {
    for (const p of s.points ?? []) {
      const v = p.value?.int64Value ?? p.value?.doubleValue ?? 0;
      total += typeof v === "string" ? Number(v) : v;
    }
  }
  return total;
}

export async function fetchMonthlyRequestCount(
  projectId: string,
  service: string,
  periodStart: string,
  periodEnd: string,
): Promise<number> {
  const filter = [
    'metric.type="serviceruntime.googleapis.com/api/request_count"',
    'resource.type="consumed_api"',
    `resource.label.service="${service}"`,
  ].join(" AND ");

  const params = new URLSearchParams({
    filter,
    "interval.startTime": periodStart,
    "interval.endTime": periodEnd,
    "aggregation.alignmentPeriod": "86400s",
    "aggregation.perSeriesAligner": "ALIGN_SUM",
    "aggregation.crossSeriesReducer": "REDUCE_SUM",
  });

  const data = await monitoringJson<{ timeSeries?: TimeSeries[] }>(
    `/projects/${projectId}/timeSeries?${params.toString()}`,
  );

  return sumPoints(data.timeSeries ?? []);
}

export function getMapsServiceDefinition(serviceId: string) {
  const match = MAPS_SERVICES.find((s) => s.id === serviceId);
  if (!match) {
    throw new Error(`Unknown Maps service: ${serviceId}`);
  }
  return match;
}

export function getMapsUsageMeta() {
  const { projectId, freeTierLimit } = getConfig();
  const window = getPacificMonthWindow();

  return {
    projectId,
    estimated: true as const,
    periodStart: window.periodStart,
    periodEnd: window.periodEnd,
    periodLabel: window.label,
    freeTierLimit,
    services: MAPS_SERVICES.map((s) => ({
      id: s.id,
      label: s.label,
      service: s.service,
      tier: s.tier,
      category: s.category,
      limit: resolveFreeTierLimit(s, freeTierLimit),
      unlimited: s.freeTierLimit === null,
    })),
  };
}

export async function fetchMapsServiceUsage(serviceId: MapsServiceId) {
  const definition = getMapsServiceDefinition(serviceId);
  const { projectId, freeTierLimit } = getConfig();
  const window = getPacificMonthWindow();

  const used = await fetchMonthlyRequestCount(
    projectId,
    definition.service,
    window.periodStart,
    window.periodEnd,
  );

  const limit = resolveFreeTierLimit(definition, freeTierLimit);
  const skus = SKUS_BY_SERVICE_ID[definition.id].map((sku) =>
    skuUsageFromApiRequests(used, sku),
  );
  const estimatedOverageUsd = Math.max(
    0,
    ...skus.map((s) => s.estimatedOverageUsd),
  );

  return {
    ...getMapsUsageMeta(),
    service: {
      id: definition.id,
      label: definition.label,
      service: definition.service,
      tier: definition.tier,
      category: definition.category,
      apiRequestCount: used,
      skus,
      estimatedOverageUsd: Math.round(estimatedOverageUsd * 100) / 100,
      ...usageSummary(used, limit),
    },
  };
}

export async function fetchMapsUsage() {
  const meta = getMapsUsageMeta();

  const services = await Promise.all(
    MAPS_SERVICES.map(async (s) => {
      const used = await fetchMonthlyRequestCount(
        meta.projectId,
        s.service,
        meta.periodStart,
        meta.periodEnd,
      );
      const limit = resolveFreeTierLimit(s, meta.freeTierLimit);
      return {
        id: s.id as MapsServiceId,
        label: s.label,
        service: s.service,
        tier: s.tier,
        category: s.category,
        ...usageSummary(used, limit),
      };
    }),
  );

  return {
    ...meta,
    services,
  };
}
