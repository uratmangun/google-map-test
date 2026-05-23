import {
  ALERT_POLICY_DISPLAY_NAME,
  ALERT_POLICY_NAME_PREFIX,
  getConfig,
  getPacificMonthWindow,
  MAPS_SERVICES,
  usageSummary,
  type MapsServiceId,
} from "@/lib/maps-free-tier";
import { monitoringFetch } from "@/lib/gcp-auth";

type TimeSeriesPoint = {
  value?: { int64Value?: string; doubleValue?: number };
};

type TimeSeries = {
  metric?: { labels?: Record<string, string> };
  resource?: { labels?: Record<string, string> };
  points?: TimeSeriesPoint[];
};

type AlertPolicy = {
  name?: string;
  displayName?: string;
  enabled?: boolean;
  notificationChannels?: string[];
};

type NotificationChannel = {
  name?: string;
  displayName?: string;
  type?: string;
  labels?: Record<string, string>;
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

export async function fetchMapsUsage() {
  const { projectId, freeTierLimit } = getConfig();
  const window = getPacificMonthWindow();

  const services = await Promise.all(
    MAPS_SERVICES.map(async (s) => {
      const used = await fetchMonthlyRequestCount(
        projectId,
        s.service,
        window.periodStart,
        window.periodEnd,
      );
      return {
        id: s.id as MapsServiceId,
        label: s.label,
        service: s.service,
        tier: s.tier,
        ...usageSummary(used, freeTierLimit),
      };
    }),
  );

  return {
    projectId,
    estimated: true as const,
    periodStart: window.periodStart,
    periodEnd: window.periodEnd,
    periodLabel: window.label,
    freeTierLimit,
    services,
  };
}

export async function listMapsAlertPolicies() {
  const { projectId } = getConfig();
  const data = await monitoringJson<{ alertPolicies?: AlertPolicy[] }>(
    `/projects/${projectId}/alertPolicies`,
  );

  return (data.alertPolicies ?? []).filter(
    (p) =>
      p.displayName?.startsWith(ALERT_POLICY_NAME_PREFIX) ||
      p.displayName === ALERT_POLICY_DISPLAY_NAME,
  );
}

async function findEmailNotificationChannel(
  projectId: string,
  email: string,
): Promise<string | null> {
  const data = await monitoringJson<{ notificationChannels?: NotificationChannel[] }>(
    `/projects/${projectId}/notificationChannels`,
  );

  const match = (data.notificationChannels ?? []).find(
    (c) =>
      c.type === "email" &&
      c.labels?.email_address?.toLowerCase() === email.toLowerCase(),
  );
  return match?.name ?? null;
}

async function createEmailNotificationChannel(projectId: string, email: string) {
  const created = await monitoringJson<NotificationChannel>(
    `/projects/${projectId}/notificationChannels`,
    {
      method: "POST",
      body: JSON.stringify({
        type: "email",
        displayName: `google-map-test-alerts-${email}`,
        labels: { email_address: email },
        enabled: true,
      }),
    },
  );
  if (!created.name) {
    throw new Error("Failed to create notification channel");
  }
  return created.name;
}

function buildAlertCondition(service: string, threshold: number) {
  const filter = [
    'resource.type="consumed_api"',
    'metric.type="serviceruntime.googleapis.com/api/request_count"',
    `resource.label.service="${service}"`,
  ].join(" AND ");

  return {
    displayName: `${service} free tier ${threshold}`,
    conditionThreshold: {
      filter,
      comparison: "COMPARISON_GT",
      thresholdValue: threshold,
      duration: "0s",
      aggregations: [
        {
          alignmentPeriod: "2592000s",
          perSeriesAligner: "ALIGN_SUM",
          crossSeriesReducer: "REDUCE_SUM",
        },
      ],
      trigger: { count: 1 },
    },
  };
}

export async function ensureQuotaAlert(alertEmailOverride?: string) {
  const { projectId, alertThreshold } = getConfig();
  const alertEmail =
    alertEmailOverride?.trim() || getConfig().alertEmail?.trim();
  if (!alertEmail) {
    throw new Error(
      "Alert email is required. Sign in with Google or set MAPS_ALERT_EMAIL.",
    );
  }

  const existing = await listMapsAlertPolicies();
  const policy = existing.find((p) => p.displayName === ALERT_POLICY_DISPLAY_NAME);
  if (policy?.name) {
    return {
      created: false,
      policyName: policy.name,
      displayName: policy.displayName ?? ALERT_POLICY_DISPLAY_NAME,
      notificationEmail: alertEmail,
    };
  }

  let channelName = await findEmailNotificationChannel(projectId, alertEmail);
  if (!channelName) {
    channelName = await createEmailNotificationChannel(projectId, alertEmail);
  }

  const conditions = MAPS_SERVICES.map((s) =>
    buildAlertCondition(s.service, alertThreshold),
  );

  const created = await monitoringJson<AlertPolicy>(
    `/projects/${projectId}/alertPolicies`,
    {
      method: "POST",
      body: JSON.stringify({
        displayName: ALERT_POLICY_DISPLAY_NAME,
        documentation: {
          content:
            "Google Maps free-tier usage exceeded 80% threshold for at least one API.",
          mimeType: "text/markdown",
        },
        combiner: "OR",
        enabled: true,
        notificationChannels: [channelName],
        conditions,
      }),
    },
  );

  return {
    created: true,
    policyName: created.name ?? "",
    displayName: created.displayName ?? ALERT_POLICY_DISPLAY_NAME,
    notificationEmail: alertEmail,
  };
}

export async function getAlertsStatus() {
  const { alertEmail } = getConfig();
  const policies = await listMapsAlertPolicies();
  const active = policies.some(
    (p) => p.displayName === ALERT_POLICY_DISPLAY_NAME && p.enabled !== false,
  );

  return {
    configured: active,
    notificationEmail: alertEmail,
    policies: policies.map((p) => ({
      name: p.name ?? "",
      displayName: p.displayName ?? "",
      enabled: p.enabled !== false,
    })),
  };
}
