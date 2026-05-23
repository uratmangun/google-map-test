export const MAPS_SERVICES = [
  {
    id: "maps-backend",
    service: "maps-backend.googleapis.com",
    label: "Maps",
    tier: "Essentials" as const,
  },
  {
    id: "geocoding-backend",
    service: "geocoding-backend.googleapis.com",
    label: "Geocoding",
    tier: "Essentials" as const,
  },
  {
    id: "places-backend",
    service: "places-backend.googleapis.com",
    label: "Places",
    tier: "Essentials" as const,
  },
] as const;

export type MapsServiceId = (typeof MAPS_SERVICES)[number]["id"];

export function getConfig() {
  const projectId =
    process.env.GCP_PROJECT_ID?.trim() || "koisose-65e33";
  const freeTierLimit = Number(
    process.env.MAPS_FREE_TIER_ESSENTIALS_LIMIT ?? "10000",
  );

  return {
    projectId,
    freeTierLimit: Number.isFinite(freeTierLimit) ? freeTierLimit : 10000,
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
  for (let t = Date.UTC(year, month - 1, 1) - 36 * 3600 * 1000; t < Date.UTC(year, month - 1, 2) + 36 * 3600 * 1000; t += 3600000) {
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

export function usageSummary(used: number, limit: number) {
  const remaining = Math.max(0, limit - used);
  const percentUsed = limit > 0 ? Math.min(100, (used / limit) * 100) : 0;
  return { used, limit, remaining, percentUsed };
}
