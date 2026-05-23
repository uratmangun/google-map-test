"use client";

import {
  AlertTriangleIcon,
  CheckCircle2Icon,
  Loader2Icon,
  LogOutIcon,
  ShieldIcon,
  Trash2Icon,
  UserPlusIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { LightCard } from "@/components/maps-quota-light-card";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type AllowedMember = {
  email: string;
  addedBy: string;
  createdAt: string;
};

type AlertsResponse = {
  configured: boolean;
  notificationEmail: string;
  policies: { name: string; displayName: string; enabled: boolean }[];
  isMaster?: boolean;
  userEmail?: string;
  members?: AllowedMember[];
  error?: string;
  needsAuth?: boolean;
  needsLogin?: boolean;
  forbidden?: boolean;
  created?: boolean;
};

const MASTER_EMAIL = "koisose0@gmail.com";

export function MapsQuotaAlertsPanel({
  userEmail: initialEmail,
  userName,
}: {
  userEmail: string | null;
  userName: string | null;
}) {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  const email = session?.user.email ?? initialEmail;
  const signedIn = Boolean(email);

  const [alerts, setAlerts] = useState<AlertsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [creatingAlert, setCreatingAlert] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);

  const [notificationEmail, setNotificationEmail] = useState("");
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [memberActionLoading, setMemberActionLoading] = useState(false);

  const projectId = "koisose-65e33";
  const monitoringUrl = `https://console.cloud.google.com/monitoring/alerting?project=${projectId}`;
  const isMaster = alerts?.isMaster ?? email === MASTER_EMAIL;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setForbidden(false);
    try {
      const res = await fetch("/api/maps/alerts");
      const json = (await res.json()) as AlertsResponse;
      if (res.status === 403 && json.forbidden) {
        setForbidden(true);
        setAlerts(null);
        setError(json.error ?? "Access denied");
        return;
      }
      if (!res.ok) {
        setError(json.error ?? "Failed to load alert status");
        setAlerts(json.needsAuth ? json : null);
      } else {
        setAlerts(json);
        setNotificationEmail(
          json.notificationEmail || json.userEmail || email || "",
        );
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [email]);

  useEffect(() => {
    if (signedIn) {
      void load();
    }
  }, [signedIn, load]);

  useEffect(() => {
    if (email && !notificationEmail) {
      setNotificationEmail(email);
    }
  }, [email, notificationEmail]);

  const signInWithGoogle = async () => {
    await authClient.signIn.social({
      provider: "google",
      callbackURL: "/maps-usage/alerts",
    });
  };

  const signOut = async () => {
    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          router.push("/maps-usage");
          router.refresh();
        },
      },
    });
  };

  const createAlert = async () => {
    setCreatingAlert(true);
    setError(null);
    try {
      const res = await fetch("/api/maps/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notificationEmail: notificationEmail.trim(),
        }),
      });
      const json = (await res.json()) as AlertsResponse & { error?: string };
      if (res.status === 403 && json.forbidden) {
        setForbidden(true);
        setError(json.error ?? "Access denied");
        return;
      }
      if (!res.ok) {
        if (json.needsLogin) {
          setError("Sign in with Google to create alerts.");
        } else {
          setError(json.error ?? "Failed to create alert");
        }
        return;
      }
      setAlerts(json);
      if (json.notificationEmail) {
        setNotificationEmail(json.notificationEmail);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create alert");
    } finally {
      setCreatingAlert(false);
    }
  };

  const addMember = async () => {
    setMemberActionLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/maps/alerts/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: newMemberEmail.trim() }),
      });
      const json = (await res.json()) as {
        error?: string;
        members?: AllowedMember[];
      };
      if (!res.ok) {
        setError(json.error ?? "Failed to add account");
        return;
      }
      setNewMemberEmail("");
      setAlerts((prev) =>
        prev ? { ...prev, members: json.members ?? prev.members } : prev,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add account");
    } finally {
      setMemberActionLoading(false);
    }
  };

  const removeMember = async (memberEmail: string) => {
    setMemberActionLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/maps/alerts/members?email=${encodeURIComponent(memberEmail)}`,
        { method: "DELETE" },
      );
      const json = (await res.json()) as {
        error?: string;
        members?: AllowedMember[];
      };
      if (!res.ok) {
        setError(json.error ?? "Failed to remove account");
        return;
      }
      setAlerts((prev) =>
        prev ? { ...prev, members: json.members ?? [] } : prev,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to remove account");
    } finally {
      setMemberActionLoading(false);
    }
  };

  if (isPending && !initialEmail) {
    return (
      <div className="flex justify-center py-24">
        <Loader2Icon className="size-8 animate-spin text-[#1a73e8]" />
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
              Quota alerts
            </h1>
          </div>
          <p className="text-sm text-[#64748b]">
            Configure email alerts for Maps free-tier usage
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/maps-usage"
            className="rounded-lg bg-white px-3.5 py-2 text-[13px] font-medium text-[#334155] shadow-sm transition hover:bg-[#f8fafc]"
          >
            ← Usage dashboard
          </Link>
          {signedIn ? (
            <button
              type="button"
              onClick={() => void signOut()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3.5 py-2 text-[13px] font-medium text-[#334155] shadow-sm transition hover:bg-[#f8fafc]"
            >
              <LogOutIcon className="size-3.5" />
              Sign out
            </button>
          ) : null}
        </div>
      </header>

      {!signedIn ? (
        <LightCard className="flex flex-col items-center gap-6 py-10 text-center">
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-[#0f172a]">
              Sign in to create alerts
            </h2>
            <p className="max-w-md text-[13px] text-[#64748b]">
              Only Google accounts on the allowlist can access this page. After
              sign-in, you can choose which email receives Monitoring alerts.
            </p>
          </div>
          <Button
            type="button"
            onClick={() => void signInWithGoogle()}
            className="rounded-lg bg-[#1a73e8] px-6 py-2.5 text-[13px] font-semibold text-white hover:bg-[#1557b0]"
          >
            <svg className="mr-2 size-4" viewBox="0 0 24 24" aria-hidden>
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Sign in with Google
          </Button>
        </LightCard>
      ) : forbidden ? (
        <LightCard className="flex flex-col gap-4 border-amber-200 bg-amber-50/50">
          <div className="flex items-start gap-3">
            <ShieldIcon className="mt-0.5 size-5 shrink-0 text-amber-700" />
            <div className="space-y-2">
              <h2 className="text-base font-semibold text-[#0f172a]">
                Access not allowed
              </h2>
              <p className="text-[13px] text-[#64748b]">
                Signed in as <strong>{email}</strong>, but this account is not on
                the allowlist. Ask{" "}
                <strong>{MASTER_EMAIL}</strong> to add your Google account.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void signOut()}
            className="self-start rounded-lg bg-white px-3.5 py-2 text-[13px] font-medium text-[#334155] shadow-sm"
          >
            Sign out
          </button>
        </LightCard>
      ) : (
        <>
          {userName ? (
            <p className="text-sm text-[#64748b]">
              Signed in as {userName} ({email})
              {isMaster ? (
                <span className="ml-2 rounded-full bg-[#e8f0fe] px-2 py-0.5 text-xs font-medium text-[#1a73e8]">
                  Master
                </span>
              ) : null}
            </p>
          ) : null}

          {alerts?.needsAuth ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              <p className="font-semibold">GCP credentials required on server</p>
              <p className="mt-1 text-red-700/90">
                Run{" "}
                <code className="rounded bg-white/80 px-1 py-0.5 text-xs">
                  gcloud auth application-default login
                </code>{" "}
                on the machine running this app.
              </p>
            </div>
          ) : null}

          {error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              {error}
            </div>
          ) : null}

          {isMaster ? (
            <LightCard className="flex flex-col gap-4">
              <div>
                <h2 className="text-base font-semibold text-[#0f172a]">
                  Access settings
                </h2>
                <p className="mt-1 text-[13px] text-[#64748b]">
                  Only listed Google accounts can sign in to this alerts page.
                  As master ({MASTER_EMAIL}), you can add or remove accounts.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Input
                  type="email"
                  placeholder="colleague@gmail.com"
                  value={newMemberEmail}
                  onChange={(e) => setNewMemberEmail(e.target.value)}
                  className="max-w-sm border-[#e2e8f0] bg-white"
                />
                <Button
                  type="button"
                  disabled={memberActionLoading || !newMemberEmail.trim()}
                  onClick={() => void addMember()}
                  className="rounded-lg bg-[#1a73e8] text-[13px] font-semibold text-white hover:bg-[#1557b0]"
                >
                  {memberActionLoading ? (
                    <Loader2Icon className="size-4 animate-spin" />
                  ) : (
                    <UserPlusIcon className="size-4" />
                  )}
                  Add account
                </Button>
              </div>
              <ul className="divide-y divide-[#f1f5f9] rounded-lg border border-[#e2e8f0]">
                {(alerts?.members ?? []).map((member) => (
                  <li
                    key={member.email}
                    className="flex items-center justify-between gap-3 px-3 py-2.5 text-[13px]"
                  >
                    <span className="text-[#0f172a]">
                      {member.email}
                      {member.email === MASTER_EMAIL ? (
                        <span className="ml-2 text-xs text-[#64748b]">
                          (master)
                        </span>
                      ) : null}
                    </span>
                    {member.email !== MASTER_EMAIL ? (
                      <button
                        type="button"
                        disabled={memberActionLoading}
                        onClick={() => void removeMember(member.email)}
                        className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50"
                      >
                        <Trash2Icon className="size-3.5" />
                        Remove
                      </button>
                    ) : null}
                  </li>
                ))}
              </ul>
            </LightCard>
          ) : null}

          <LightCard className="flex flex-col gap-4">
            <div>
              <h2 className="text-base font-semibold text-[#0f172a]">
                Quota alert
              </h2>
              <p className="mt-1 text-[13px] text-[#64748b]">
                Email alerts at 80% of free tier (~8,000 requests/month per API).
                Alerts warn only; they do not block API calls.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {loading ? (
                <Loader2Icon className="size-5 animate-spin text-[#1a73e8]" />
              ) : alerts?.configured ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-800">
                  <CheckCircle2Icon className="size-3.5" />
                  Alert active
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#f1f5f9] px-3 py-1.5 text-xs font-medium text-[#475569]">
                  <AlertTriangleIcon className="size-3.5" />
                  Not configured
                </span>
              )}
            </div>
            <div className="space-y-1.5">
              <label
                htmlFor="notification-email"
                className="text-[13px] font-medium text-[#334155]"
              >
                Send alerts to
              </label>
              <Input
                id="notification-email"
                type="email"
                value={notificationEmail}
                onChange={(e) => setNotificationEmail(e.target.value)}
                placeholder="you@example.com"
                className="max-w-md border-[#e2e8f0] bg-white"
              />
              <p className="text-xs text-[#64748b]">
                GCP Monitoring will email this address when usage crosses the
                threshold. Can differ from your sign-in account.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => void createAlert()}
                disabled={
                  creatingAlert ||
                  loading ||
                  alerts?.configured ||
                  !notificationEmail.trim()
                }
                className="rounded-lg bg-[#1a73e8] px-[18px] py-2.5 text-[13px] font-semibold text-white hover:bg-[#1557b0] disabled:opacity-50"
              >
                {creatingAlert ? (
                  <Loader2Icon className={cn("animate-spin")} />
                ) : null}
                {alerts?.configured ? "Alert already set" : "Create alert"}
              </Button>
              <a
                href={monitoringUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#f1f5f9] px-[18px] py-2.5 text-[13px] font-medium text-[#334155] transition hover:bg-[#e2e8f0]"
              >
                Monitoring console
              </a>
            </div>
          </LightCard>
        </>
      )}
    </div>
  );
}
