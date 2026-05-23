"use client";

/**
 * Public usage dashboard — designs/quota.pen (alert setup is on /maps-usage/alerts).
 */
import {
  AlertTriangleIcon,
  BellIcon,
  CheckCircle2Icon,
  ExternalLinkIcon,
  Loader2Icon,
  RefreshCwIcon,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { MapsAuthSignIn } from "@/components/maps-auth-sign-in";
import { LightCard } from "@/components/maps-quota-light-card";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

type ServiceUsage = {
  id: string;
  label: string;
  service: string;
  tier: string;
  used: number;
  limit: number;
  remaining: number;
  percentUsed: number;
};

type UsageResponse = {
  projectId: string;
  estimated: boolean;
  periodStart: string;
  periodEnd: string;
  periodLabel: string;
  freeTierLimit: number;
  services: ServiceUsage[];
  error?: string;
  needsAuth?: boolean;
};

type AlertsResponse = {
  configured: boolean;
  notificationEmail: string;
};

function UsageBar({ percent }: { percent: number }) {
  const fill =
    percent >= 80
      ? "bg-red-500"
      : percent >= 50
        ? "bg-amber-400"
        : "bg-emerald-500";
  return (
    <div className="h-2.5 w-full overflow-hidden rounded-full bg-[#f1f5f9]">
      <div
        className={cn("h-full rounded-full transition-all", fill)}
        style={{ width: `${Math.min(100, percent)}%` }}
      />
    </div>
  );
}

function formatNumber(n: number) {
  return new Intl.NumberFormat("en-US").format(n);
}

export function MapsQuotaDashboard() {
  const { data: session, isPending: sessionPending } = authClient.useSession();
  const signedIn = Boolean(session?.user);

  const [usage, setUsage] = useState<UsageResponse | null>(null);
  const [alerts, setAlerts] = useState<AlertsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [needsLogin, setNeedsLogin] = useState(false);

  const load = useCallback(async () => {
    if (!signedIn) {
      setLoading(false);
      setNeedsLogin(true);
      return;
    }

    setLoading(true);
    setError(null);
    setNeedsLogin(false);
    try {
      const [usageRes, alertsRes] = await Promise.all([
        fetch("/api/maps/usage"),
        fetch("/api/maps/alerts"),
      ]);
      const usageJson = (await usageRes.json()) as UsageResponse & {
        needsLogin?: boolean;
      };
      const alertsJson = (await alertsRes.json()) as AlertsResponse & {
        error?: string;
        needsAuth?: boolean;
        needsLogin?: boolean;
      };

      if (usageRes.status === 401 && usageJson.needsLogin) {
        setNeedsLogin(true);
        setUsage(null);
        setAlerts(null);
        return;
      }

      if (!usageRes.ok) {
        setError(usageJson.error ?? "Failed to load usage");
        setUsage(usageJson.needsAuth ? usageJson : null);
      } else {
        setUsage(usageJson);
      }

      if (alertsRes.ok) {
        setAlerts(alertsJson);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [signedIn]);

  useEffect(() => {
    if (sessionPending) return;
    void load();
  }, [load, sessionPending]);

  const needsGcp = usage?.needsAuth;
  const projectId = usage?.projectId ?? "koisose-65e33";
  const periodLabel = usage?.periodLabel ?? "";
  const consoleUrl = `https://console.cloud.google.com/google/maps-apis/metrics?project=${projectId}`;

  if (sessionPending) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2Icon className="size-8 animate-spin text-[#1a73e8]" />
      </div>
    );
  }

  if (!signedIn || needsLogin) {
    return (
      <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-6 px-6 py-12">
        <header className="space-y-2">
          <h1 className="text-[28px] font-semibold leading-tight text-[#0f172a]">
            Maps quota dashboard
          </h1>
          <p className="text-sm text-[#64748b]">
            Sign in to view estimated free-tier usage for this project.
          </p>
        </header>
        <MapsAuthSignIn
          title="Sign in to view usage"
          description="Google sign-in is required to load Maps API usage and alert status from the server."
          callbackURL="/maps-usage"
        />
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-6 px-6 py-12">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-[10px] bg-[#e8f0fe] text-sm font-bold text-[#1a73e8]">
              M
            </span>
            <h1 className="text-[28px] font-semibold leading-tight text-[#0f172a]">
              Maps quota dashboard
            </h1>
          </div>
          <p className="text-sm text-[#64748b]">
            Estimated free-tier usage
            {periodLabel ? ` · ${periodLabel}` : null}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="rounded-lg bg-white px-3.5 py-2 text-[13px] font-medium text-[#334155] shadow-sm transition hover:bg-[#f8fafc] disabled:opacity-50"
          >
            <span className="inline-flex items-center gap-1.5">
              <RefreshCwIcon
                className={cn("size-3.5", loading && "animate-spin")}
              />
              Refresh
            </span>
          </button>
          <Link
            href="/"
            className="rounded-lg bg-white px-3.5 py-2 text-[13px] font-medium text-[#334155] shadow-sm transition hover:bg-[#f8fafc]"
          >
            Home
          </Link>
        </div>
      </header>

      {needsGcp ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <p className="font-semibold">GCP credentials required</p>
          <p className="mt-1 text-red-700/90">
            Run{" "}
            <code className="rounded bg-white/80 px-1 py-0.5 text-xs">
              gcloud auth application-default login
            </code>{" "}
            on the server, then refresh.
          </p>
        </div>
      ) : null}

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      <div className="flex gap-3 rounded-xl bg-[#fffbeb] p-4">
        <AlertTriangleIcon className="mt-0.5 size-4 shrink-0 text-[#d97706]" />
        <div className="space-y-1">
          <p className="text-sm font-semibold text-[#92400e]">Estimated usage</p>
          <p className="text-[13px] leading-relaxed text-[#a16207]">
            Counts from Cloud Monitoring. Essentials tier default 10,000
            requests/month per API. Billing resets monthly in Pacific time.
          </p>
        </div>
      </div>

      {/* Public summary — full setup on /maps-usage/alerts (Google sign-in) */}
      <LightCard className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <BellIcon className="size-4 text-[#1a73e8]" />
            <h2 className="text-base font-semibold text-[#0f172a]">Quota alert</h2>
            {alerts?.configured ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-800">
                <CheckCircle2Icon className="size-3" />
                Active
              </span>
            ) : (
              <span className="rounded-full bg-[#f1f5f9] px-2 py-0.5 text-[11px] font-medium text-[#475569]">
                Not configured
              </span>
            )}
          </div>
          <p className="text-[13px] text-[#64748b]">
            Email alerts at 80% of free tier. Sign in with Google to create alerts
            for your account.
          </p>
        </div>
        <Link
          href="/maps-usage/alerts"
          className="inline-flex shrink-0 items-center justify-center rounded-lg bg-[#1a73e8] px-[18px] py-2.5 text-[13px] font-semibold text-white transition hover:bg-[#1557b0]"
        >
          Set up alerts
        </Link>
      </LightCard>

      {loading && !usage ? (
        <div className="flex justify-center py-16">
          <Loader2Icon className="size-8 animate-spin text-[#1a73e8]" />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          {(usage?.services ?? []).map((s) => (
            <LightCard key={s.id} className="flex flex-col gap-3">
              <div>
                <h3 className="text-base font-semibold text-[#0f172a]">
                  {s.label}
                </h3>
                <p className="text-[11px] text-[#94a3b8]">{s.service}</p>
              </div>
              <UsageBar percent={s.percentUsed} />
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg bg-[#f8fafc] px-2 py-2.5">
                  <p className="text-[11px] text-[#64748b]">Used</p>
                  <p className="text-sm font-semibold tabular-nums text-[#0f172a]">
                    {formatNumber(s.used)}
                  </p>
                </div>
                <div className="rounded-lg bg-[#ecfdf5] px-2 py-2.5">
                  <p className="text-[11px] text-emerald-800/80">Left</p>
                  <p className="text-sm font-semibold tabular-nums text-[#15803d]">
                    {formatNumber(s.remaining)}
                  </p>
                </div>
                <div className="rounded-lg bg-[#f8fafc] px-2 py-2.5">
                  <p className="text-[11px] text-[#64748b]">Limit</p>
                  <p className="text-sm font-semibold tabular-nums text-[#0f172a]">
                    {formatNumber(s.limit)}
                  </p>
                </div>
              </div>
              <p className="text-center text-[11px] text-[#94a3b8]">
                {s.percentUsed > 0 && s.percentUsed < 1
                  ? "< 1"
                  : s.percentUsed.toFixed(1)}
                % of free tier
              </p>
            </LightCard>
          ))}
        </div>
      )}

      <p className="text-center">
        <a
          href={consoleUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[#1a73e8] hover:text-[#1557b0] hover:underline"
        >
          <ExternalLinkIcon className="size-3.5" />
          Open Google Maps metrics in Cloud Console
        </a>
      </p>
    </div>
  );
}
