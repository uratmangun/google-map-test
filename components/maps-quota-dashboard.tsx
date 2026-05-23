"use client";

/**
 * Public usage dashboard — designs/quota.pen
 */
import {
  AlertTriangleIcon,
  ExternalLinkIcon,
  Loader2Icon,
  RefreshCwIcon,
  SearchIcon,
  XIcon,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { MapsAuthSignIn } from "@/components/maps-auth-sign-in";
import { LightCard } from "@/components/maps-quota-light-card";
import { authClient } from "@/lib/auth-client";
import {
  getServicesByCategory,
  MAPS_SERVICE_CATEGORIES,
  MAPS_SERVICES,
  type MapsServiceCategory,
  type MapsServiceId,
} from "@/lib/maps-free-tier";
import { cn } from "@/lib/utils";

type SkuUsage = {
  skuKey: string;
  label: string;
  tier: string;
  mcpTools?: string[];
  used: number;
  limit: number | null;
  remaining: number | null;
  percentUsed: number;
  unlimited?: boolean;
  atLimit: boolean;
  estimatedOverageUsd: number;
};

type ServiceUsage = {
  id: string;
  label: string;
  service: string;
  tier: string;
  used: number;
  limit: number | null;
  remaining: number | null;
  percentUsed: number;
  unlimited?: boolean;
  apiRequestCount?: number;
  skus?: SkuUsage[];
  estimatedOverageUsd?: number;
};

type CategoryBillingEstimate = {
  category: MapsServiceCategory;
  periodLabel: string;
  estimatedOverageUsd: number;
  note: string;
};

type UsageMetaResponse = {
  projectId: string;
  estimated: boolean;
  periodStart: string;
  periodEnd: string;
  periodLabel: string;
  freeTierLimit: number;
  services: Array<{
    id: string;
    label: string;
    service: string;
    tier: string;
    limit: number | null;
    unlimited?: boolean;
  }>;
  error?: string;
  needsAuth?: boolean;
};

type ServiceUsageResponse = UsageMetaResponse & {
  service: ServiceUsage;
};

type CardUsageState = {
  loading: boolean;
  error: string | null;
  needsAuth: boolean;
  data: ServiceUsage | null;
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

function formatUsd(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

type CategoryBillingState = {
  loading: boolean;
  error: string | null;
  data: CategoryBillingEstimate | null;
};

function initialCategoryBilling(): Record<
  MapsServiceCategory,
  CategoryBillingState
> {
  return Object.fromEntries(
    MAPS_SERVICE_CATEGORIES.map((category) => [
      category,
      { loading: false, error: null, data: null },
    ]),
  ) as Record<MapsServiceCategory, CategoryBillingState>;
}

function matchesApiSearch(
  definition: { label: string; service: string; id: string },
  query: string,
) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    definition.label.toLowerCase().includes(q) ||
    definition.service.toLowerCase().includes(q) ||
    definition.id.toLowerCase().replace(/-/g, " ").includes(q)
  );
}

function initialCardState(): Record<MapsServiceId, CardUsageState> {
  return Object.fromEntries(
    MAPS_SERVICES.map((s) => [
      s.id,
      { loading: false, error: null, needsAuth: false, data: null },
    ]),
  ) as Record<MapsServiceId, CardUsageState>;
}

export function MapsQuotaDashboard() {
  const { data: session, isPending: sessionPending } = authClient.useSession();
  const signedIn = Boolean(session?.user);

  const [meta, setMeta] = useState<UsageMetaResponse | null>(null);
  const [cardUsage, setCardUsage] =
    useState<Record<MapsServiceId, CardUsageState>>(initialCardState);
  const [metaLoading, setMetaLoading] = useState(true);
  const [metaError, setMetaError] = useState<string | null>(null);
  const [needsLogin, setNeedsLogin] = useState(false);
  const [globalNeedsGcp, setGlobalNeedsGcp] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryBilling, setCategoryBilling] = useState(
    initialCategoryBilling,
  );

  const filteredGroups = useMemo(() => {
    return getServicesByCategory()
      .map((group) => ({
        ...group,
        services: group.services.filter((s) =>
          matchesApiSearch(s, searchQuery),
        ),
      }))
      .filter((group) => group.services.length > 0);
  }, [searchQuery]);

  const totalVisible = filteredGroups.reduce(
    (n, g) => n + g.services.length,
    0,
  );
  const isFiltering = searchQuery.trim().length > 0;

  const loadMeta = useCallback(async () => {
    if (!signedIn) {
      setMetaLoading(false);
      setNeedsLogin(true);
      return;
    }

    setMetaLoading(true);
    setMetaError(null);
    setNeedsLogin(false);
    setGlobalNeedsGcp(false);
    try {
      const usageRes = await fetch("/api/maps/usage");
      const usageJson = (await usageRes.json()) as UsageMetaResponse & {
        needsLogin?: boolean;
      };

      if (usageRes.status === 401 && usageJson.needsLogin) {
        setNeedsLogin(true);
        setMeta(null);
        return;
      }

      if (!usageRes.ok) {
        setMetaError(usageJson.error ?? "Failed to load dashboard");
        setMeta(usageJson.needsAuth ? usageJson : null);
        setGlobalNeedsGcp(Boolean(usageJson.needsAuth));
      } else {
        setMeta(usageJson);
      }
    } catch (e) {
      setMetaError(e instanceof Error ? e.message : "Failed to load data");
    } finally {
      setMetaLoading(false);
    }
  }, [signedIn]);

  const refreshCategoryBilling = useCallback(
    async (category: MapsServiceCategory) => {
      setCategoryBilling((prev) => ({
        ...prev,
        [category]: { ...prev[category], loading: true, error: null },
      }));

      try {
        const res = await fetch(
          `/api/maps/billing?category=${encodeURIComponent(category)}`,
        );
        const json = (await res.json()) as CategoryBillingEstimate & {
          error?: string;
          needsAuth?: boolean;
        };

        if (!res.ok) {
          setCategoryBilling((prev) => ({
            ...prev,
            [category]: {
              loading: false,
              error: json.error ?? "Failed to load billing estimate",
              data: null,
            },
          }));
          if (json.needsAuth) setGlobalNeedsGcp(true);
          return;
        }

        setCategoryBilling((prev) => ({
          ...prev,
          [category]: { loading: false, error: null, data: json },
        }));
      } catch (e) {
        setCategoryBilling((prev) => ({
          ...prev,
          [category]: {
            loading: false,
            error: e instanceof Error ? e.message : "Failed to load estimate",
            data: null,
          },
        }));
      }
    },
    [],
  );

  const refreshService = useCallback(
    async (serviceId: MapsServiceId) => {
      setCardUsage((prev) => ({
        ...prev,
        [serviceId]: {
          ...prev[serviceId],
          loading: true,
          error: null,
          needsAuth: false,
        },
      }));

      try {
        const res = await fetch(
          `/api/maps/usage?service=${encodeURIComponent(serviceId)}`,
        );
        const json = (await res.json()) as ServiceUsageResponse & {
          needsLogin?: boolean;
          needsAuth?: boolean;
        };

        if (res.status === 401 && json.needsLogin) {
          setNeedsLogin(true);
          return;
        }

        if (!res.ok) {
          setCardUsage((prev) => ({
            ...prev,
            [serviceId]: {
              loading: false,
              error: json.error ?? "Failed to load usage",
              needsAuth: Boolean(json.needsAuth),
              data: null,
            },
          }));
          if (json.needsAuth) {
            setGlobalNeedsGcp(true);
          }
          return;
        }

        setMeta((prev) => ({
          ...json,
          services: prev?.services ?? json.services,
        }));
        setCardUsage((prev) => ({
          ...prev,
          [serviceId]: {
            loading: false,
            error: null,
            needsAuth: false,
            data: json.service,
          },
        }));
      } catch (e) {
        setCardUsage((prev) => ({
          ...prev,
          [serviceId]: {
            loading: false,
            error: e instanceof Error ? e.message : "Failed to load usage",
            needsAuth: false,
            data: null,
          },
        }));
      }
    },
    [],
  );

  useEffect(() => {
    if (sessionPending) return;
    void loadMeta();
  }, [loadMeta, sessionPending]);

  const projectId = meta?.projectId ?? "coba-409011";
  const periodLabel = meta?.periodLabel ?? "";
  const freeTierLimit = meta?.freeTierLimit ?? 10_000;
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
          description="Google sign-in is required to load Maps API usage from the server."
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
        <Link
          href="/"
          className="rounded-lg bg-white px-3.5 py-2 text-[13px] font-medium text-[#334155] shadow-sm transition hover:bg-[#f8fafc]"
        >
          Home
        </Link>
      </header>

      {globalNeedsGcp ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <p className="font-semibold">GCP credentials required</p>
          <p className="mt-1 text-red-700/90">
            Run{" "}
            <code className="rounded bg-white/80 px-1 py-0.5 text-xs">
              gcloud auth application-default login
            </code>{" "}
            on the server, then use Refresh on a card.
          </p>
        </div>
      ) : null}

      {metaError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {metaError}
        </div>
      ) : null}

      <div className="flex gap-3 rounded-xl bg-[#fffbeb] p-4">
        <AlertTriangleIcon className="mt-0.5 size-4 shrink-0 text-[#d97706]" />
        <div className="space-y-1">
          <p className="text-sm font-semibold text-[#92400e]">Estimated usage</p>
          <p className="text-[13px] leading-relaxed text-[#a16207]">
            Click Refresh on a card to load counts from Cloud Monitoring.
            Refresh a card for API + per-SKU free-tier usage (Monitoring counts
            are per API hostname, shared across SKUs). Use section &ldquo;Refresh
            billing est.&rdquo; for worst-case overage $ (not official invoice).
          </p>
        </div>
      </div>

      {metaLoading ? (
        <div className="flex justify-center py-16">
          <Loader2Icon className="size-8 animate-spin text-[#1a73e8]" />
        </div>
      ) : (
        <div className="flex flex-col gap-10">
          <div className="relative">
            <SearchIcon
              className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[#94a3b8]"
              aria-hidden
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search APIs (Static Maps, Maps Embed, Places)…"
              className="w-full rounded-xl border border-[#e2e8f0] bg-white py-2.5 pl-10 pr-10 text-sm text-[#0f172a] shadow-sm outline-none transition placeholder:text-[#94a3b8] focus:border-[#1a73e8] focus:ring-2 focus:ring-[#1a73e8]/20"
              aria-label="Search APIs by name"
            />
            {isFiltering ? (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-lg text-[#64748b] transition hover:bg-[#f1f5f9] hover:text-[#0f172a]"
                aria-label="Clear search"
              >
                <XIcon className="size-4" />
              </button>
            ) : null}
          </div>

          {isFiltering && totalVisible === 0 ? (
            <p className="py-8 text-center text-sm text-[#64748b]">
              No APIs match &ldquo;{searchQuery.trim()}&rdquo;
            </p>
          ) : null}

          {filteredGroups.map((group) => {
            const billing = categoryBilling[group.category];
            return (
            <section key={group.category} className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-[#0f172a]">
                  {group.label}
                </h2>
                <div className="flex flex-wrap items-center gap-2">
                  {billing.data ? (
                    <span className="text-[13px] text-[#64748b]">
                      Est. overage:{" "}
                      <span className="font-semibold text-[#0f172a]">
                        {formatUsd(billing.data.estimatedOverageUsd)}
                      </span>
                    </span>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => void refreshCategoryBilling(group.category)}
                    disabled={billing.loading}
                    className="inline-flex items-center gap-1 rounded-lg bg-[#f1f5f9] px-2.5 py-1.5 text-[12px] font-medium text-[#334155] transition hover:bg-[#e2e8f0] disabled:opacity-50"
                  >
                    <RefreshCwIcon
                      className={cn(
                        "size-3",
                        billing.loading && "animate-spin",
                      )}
                    />
                    Refresh billing est.
                  </button>
                </div>
              </div>
              {billing.error ? (
                <p className="text-[12px] text-red-700">{billing.error}</p>
              ) : null}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {group.services.map((definition) => {
                  const state = cardUsage[definition.id];
                  const usage = state.data;
                  const metaService = meta?.services.find(
                    (s) => s.id === definition.id,
                  );
                  const isUnlimited =
                    definition.freeTierLimit === null ||
                    Boolean(metaService?.unlimited);
                  const defaultLimit =
                    definition.freeTierLimit ?? freeTierLimit;
                  const limit = usage?.limit ?? defaultLimit;
                  const hasUsage = usage !== null;

                  return (
                    <LightCard
                      key={definition.id}
                      className="flex flex-col gap-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="text-base font-semibold text-[#0f172a]">
                            {definition.label}
                          </h3>
                          <p className="text-[11px] text-[#94a3b8]">
                            {definition.service}
                          </p>
                          <p className="text-[10px] text-[#64748b]">
                            MCP tools:{" "}
                            {definition.mcpTools.map((tool) => (
                              <code
                                key={tool}
                                className="mr-1 rounded bg-[#f1f5f9] px-1 py-0.5 text-[10px]"
                              >
                                {tool}
                              </code>
                            ))}
                          </p>
                          <p className="mt-0.5 text-[10px] font-medium uppercase tracking-wide text-[#64748b]">
                            {definition.tier}
                            {isUnlimited
                              ? " · unlimited free"
                              : definition.freeTierLimit
                                ? ` · ${formatNumber(definition.freeTierLimit)} free/mo`
                                : null}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => void refreshService(definition.id)}
                          disabled={state.loading}
                          className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-[#f1f5f9] px-2.5 py-1.5 text-[12px] font-medium text-[#334155] transition hover:bg-[#e2e8f0] disabled:opacity-50"
                        >
                          <RefreshCwIcon
                            className={cn(
                              "size-3",
                              state.loading && "animate-spin",
                            )}
                          />
                          Refresh
                        </button>
                      </div>

                      {state.error ? (
                        <p className="text-[12px] text-red-700">
                          {state.error}
                        </p>
                      ) : null}

                      {hasUsage ? (
                        <div className="space-y-3">
                          <p className="text-[11px] text-[#64748b]">
                            API requests (Monitoring):{" "}
                            <span className="font-semibold tabular-nums text-[#0f172a]">
                              {formatNumber(
                                usage.apiRequestCount ?? usage.used,
                              )}
                            </span>
                            {usage.estimatedOverageUsd != null &&
                            usage.estimatedOverageUsd > 0 ? (
                              <span className="text-amber-700">
                                {" "}
                                · est. overage {formatUsd(usage.estimatedOverageUsd)}
                              </span>
                            ) : null}
                          </p>
                          {usage.skus && usage.skus.length > 0 ? (
                            <ul className="space-y-2.5 border-t border-[#f1f5f9] pt-2">
                              {usage.skus.map((sku) => (
                                <li key={sku.skuKey} className="space-y-1">
                                  <div className="flex items-start justify-between gap-1">
                                    <p className="text-[11px] font-medium leading-snug text-[#334155]">
                                      {sku.label}
                                    </p>
                                    <span className="shrink-0 text-[9px] font-medium uppercase text-[#94a3b8]">
                                      {sku.tier}
                                    </span>
                                  </div>
                                  {sku.mcpTools && sku.mcpTools.length > 0 ? (
                                    <p className="text-[10px] text-[#94a3b8]">
                                      MCP:{" "}
                                      {sku.mcpTools.map((tool) => (
                                        <code
                                          key={tool}
                                          className="mr-1 rounded bg-[#f8fafc] px-1 py-px text-[9px] text-[#64748b]"
                                        >
                                          {tool}
                                        </code>
                                      ))}
                                    </p>
                                  ) : null}
                                  {sku.unlimited ? (
                                    <p className="text-[10px] text-emerald-700">
                                      Unlimited free tier
                                    </p>
                                  ) : (
                                    <>
                                      <UsageBar percent={sku.percentUsed} />
                                      <p
                                        className={cn(
                                          "text-[10px] tabular-nums",
                                          sku.atLimit
                                            ? "font-semibold text-red-700"
                                            : "text-[#64748b]",
                                        )}
                                      >
                                        {formatNumber(sku.used)} /{" "}
                                        {formatNumber(sku.limit ?? 0)} free
                                        {sku.atLimit ? " · AT LIMIT" : ""}
                                      </p>
                                    </>
                                  )}
                                </li>
                              ))}
                            </ul>
                          ) : isUnlimited || usage.unlimited ? (
                            <p className="text-center text-[11px] text-emerald-700">
                              Unlimited free usage
                            </p>
                          ) : (
                            <>
                              <UsageBar percent={usage.percentUsed} />
                              <p className="text-center text-[11px] text-[#94a3b8]">
                                {usage.percentUsed.toFixed(1)}% of API free tier
                              </p>
                            </>
                          )}
                        </div>
                      ) : (
                        <p className="py-6 text-center text-[13px] text-[#94a3b8]">
                          {state.loading
                            ? "Loading usage…"
                            : isUnlimited
                              ? "Unlimited free tier · Refresh to load count"
                              : `Limit ${formatNumber(defaultLimit)} / month · Refresh to load`}
                        </p>
                      )}
                    </LightCard>
                  );
                })}
              </div>
            </section>
            );
          })}
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
