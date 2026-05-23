"use client";

import type { UIMessage } from "ai";
import { Loader2Icon, LogOutIcon, MenuIcon } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { MapsAuthSignIn } from "@/components/maps-auth-sign-in";
import { MapsChatPanel } from "@/components/maps-chat-panel";
import { MapsChatSidebar } from "@/components/maps-chat-sidebar";
import { authClient } from "@/lib/auth-client";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldContent, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  areMessagesEqual,
  normalizeStoredMessages,
  createThread,
  deriveTitleFromMessages,
  filterThreads,
  loadActiveThreadId,
  loadThreads,
  saveActiveThreadId,
  saveThreads,
  type ChatThread,
} from "@/lib/maps-chat-store";
import { DEFAULT_MODEL } from "@/lib/maps-system-prompt";
import type { UiModel } from "@/lib/models";
import { cn } from "@/lib/utils";

type ModelApiResponse = {
  configured: boolean;
  message: string | null;
  data: UiModel[];
};

type DefaultProviderConfig = {
  defaultConfigured: boolean;
  defaultModel: string;
};

type ProviderSettings = {
  baseURL: string;
  apiKey: string;
  model: string;
  systemPrompt: string;
};

const STORAGE_KEY = "maps-assistant-settings-v1";

const FALLBACK_MODELS: UiModel[] = [
  {
    id: DEFAULT_MODEL,
    name: DEFAULT_MODEL,
    provider: "openai",
    providerLabel: "OpenAI-compatible",
  },
];

function loadSettings(): ProviderSettings {
  if (typeof window === "undefined") {
    return {
      baseURL: "",
      apiKey: "",
      model: DEFAULT_MODEL,
      systemPrompt: "",
    };
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);

  if (!raw) {
    return {
      baseURL: "",
      apiKey: "",
      model: DEFAULT_MODEL,
      systemPrompt: "",
    };
  }

  try {
    const parsed = JSON.parse(raw) as Partial<ProviderSettings>;
    return {
      baseURL: parsed.baseURL ?? "",
      apiKey: parsed.apiKey ?? "",
      model: parsed.model ?? DEFAULT_MODEL,
      systemPrompt: parsed.systemPrompt ?? "",
    };
  } catch {
    return {
      baseURL: "",
      apiKey: "",
      model: DEFAULT_MODEL,
      systemPrompt: "",
    };
  }
}

function ensureInitialThreads(): { threads: ChatThread[]; activeId: string } {
  const stored = loadThreads();
  const activeStored = loadActiveThreadId();

  if (stored.length > 0) {
    const activeId =
      activeStored && stored.some((t) => t.id === activeStored)
        ? activeStored
        : stored[0].id;
    return { threads: stored, activeId };
  }

  const first = createThread();
  saveThreads([first]);
  saveActiveThreadId(first.id);
  return { threads: [first], activeId: first.id };
}

export function HomePageClient() {
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const { data: session, isPending: sessionPending } = authClient.useSession();
  const signedIn = Boolean(session?.user);

  const [settings, setSettings] = useState<ProviderSettings>(() => loadSettings());
  const [draftSettings, setDraftSettings] = useState<ProviderSettings>(() => loadSettings());
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [models, setModels] = useState<UiModel[]>(FALLBACK_MODELS);
  const [modelsMessage, setModelsMessage] = useState<string | null>(null);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [defaultProvider, setDefaultProvider] = useState<DefaultProviderConfig>({
    defaultConfigured: false,
    defaultModel: DEFAULT_MODEL,
  });

  const usesCustomProvider = settings.baseURL.trim() !== "";
  const showModelsAlert = !defaultProvider.defaultConfigured && !usesCustomProvider;

  useEffect(() => {
    const { threads: initialThreads, activeId } = ensureInitialThreads();
    setThreads(initialThreads);
    setActiveThreadId(activeId);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated || !signedIn) return;

    void (async () => {
      try {
        const response = await fetch("/api/ai/provider", { cache: "no-store" });
        if (!response.ok) return;
        const config = (await response.json()) as DefaultProviderConfig;
        setDefaultProvider(config);
      } catch {
        // Keep fallback; custom provider may still work.
      }
    })();
  }, [hydrated, signedIn]);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [hydrated, settings]);

  const modelOptions = useMemo(() => {
    const map = new Map<string, UiModel>();

    for (const model of [...models, ...FALLBACK_MODELS]) {
      map.set(model.id, model);
    }

    if (!map.has(settings.model)) {
      map.set(settings.model, {
        id: settings.model,
        name: settings.model,
        provider: "openai",
        providerLabel: "Custom",
      });
    }

    return Array.from(map.values());
  }, [models, settings.model]);

  const loadModels = useCallback(
    async (
      nextSettings: ProviderSettings,
      providerConfig: DefaultProviderConfig = defaultProvider,
    ) => {
      const custom = nextSettings.baseURL.trim() !== "";

      if (!custom && !providerConfig.defaultConfigured) {
        setModels(FALLBACK_MODELS);
        setModelsMessage(
          "Configure AI_PROVIDER_* on the server or add a custom OpenAI-compatible URL in API settings.",
        );
        return;
      }

      setModelsLoading(true);

      try {
        const response = await fetch("/api/models", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(
            custom
              ? {
                  baseURL: nextSettings.baseURL,
                  apiKey: nextSettings.apiKey,
                }
              : {},
          ),
        });

        if (!response.ok) {
          throw new Error(`Failed with status ${response.status}`);
        }

        const payload = (await response.json()) as ModelApiResponse;
        setModels(payload.data.length > 0 ? payload.data : FALLBACK_MODELS);
        setModelsMessage(payload.message ?? null);

        const preferredModel = nextSettings.model.trim();
        const hasPreferred =
          preferredModel.length > 0 &&
          payload.data.some((model) => model.id === preferredModel);

        if (payload.data.length > 0 && !hasPreferred) {
          setSettings((prev) => ({
            ...prev,
            model: payload.data[0]!.id,
          }));
        }
      } catch {
        setModels(FALLBACK_MODELS);
        setModelsMessage("Could not load models from the configured API.");
      } finally {
      setModelsLoading(false);
    }
  },
    [defaultProvider],
  );

  useEffect(() => {
    if (!hydrated || !signedIn) return;
    void loadModels(settings, defaultProvider);
    // Reload model list when provider config changes — not when only the selected model changes.
  }, [
    hydrated,
    signedIn,
    loadModels,
    defaultProvider,
    settings.baseURL,
    settings.apiKey,
  ]);

  const signOut = useCallback(async () => {
    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          window.location.href = "/";
        },
      },
    });
  }, []);

  const visibleThreads = useMemo(
    () => filterThreads(threads, searchQuery),
    [threads, searchQuery],
  );

  const activeThread = useMemo(
    () => threads.find((t) => t.id === activeThreadId) ?? null,
    [threads, activeThreadId],
  );

  const persistThreads = useCallback((next: ChatThread[]) => {
    setThreads(next);
    saveThreads(next);
  }, []);

  const handleSelectThread = useCallback((id: string) => {
    setActiveThreadId(id);
    saveActiveThreadId(id);
    setSidebarOpen(false);
  }, []);

  useEffect(() => {
    if (!sidebarOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSidebarOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [sidebarOpen]);

  const handleNewChat = useCallback(() => {
    const thread = createThread();
    const next = [thread, ...threads];
    persistThreads(next);
    handleSelectThread(thread.id);
    setSearchQuery("");
  }, [handleSelectThread, persistThreads, threads]);

  const handleMessagesChange = useCallback((threadId: string, messages: UIMessage[]) => {
    setThreads((prev) => {
      const current = prev.find((t) => t.id === threadId);
      if (current && areMessagesEqual(current.messages, messages)) {
        return prev;
      }

      const persistedMessages = normalizeStoredMessages(messages);

      const next = prev.map((t) =>
        t.id === threadId
          ? {
              ...t,
              messages: persistedMessages,
              title: deriveTitleFromMessages(persistedMessages),
              updatedAt: Date.now(),
            }
          : t,
      );
      saveThreads(next);
      return next;
    });
  }, []);

  const handleActiveMessagesChange = useCallback(
    (messages: UIMessage[]) => {
      if (!activeThreadId) return;
      handleMessagesChange(activeThreadId, messages);
    },
    [activeThreadId, handleMessagesChange],
  );

  const handleSaveSettings = useCallback(() => {
    const nextModel = draftSettings.model.trim() || settings.model || DEFAULT_MODEL;

    const nextSettings: ProviderSettings = {
      baseURL: draftSettings.baseURL.trim(),
      apiKey: draftSettings.apiKey.trim(),
      model: nextModel,
      systemPrompt: draftSettings.systemPrompt,
    };

    setSettings(nextSettings);
    setSettingsOpen(false);
    void loadModels(nextSettings, defaultProvider);
  }, [draftSettings, defaultProvider, loadModels, settings.model]);

  if (!hydrated || sessionPending) {
    return (
      <main className="maps-quota-light flex min-h-screen items-center justify-center">
        <Loader2Icon className="size-6 animate-spin text-[#64748b]" />
      </main>
    );
  }

  return (
    <main className="maps-quota-light min-h-screen">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-5 md:px-6 md:py-6">
        <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {signedIn ? (
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setSidebarOpen(true)}
                className="size-9 shrink-0 rounded-xl border-[#e2e8f0] bg-white text-[#334155] hover:bg-[#f8fafc] hover:text-black [&_svg]:hover:text-black"
                aria-label="Open chats"
              >
                <MenuIcon className="size-4" />
              </Button>
            ) : null}
            <span className="flex size-9 items-center justify-center rounded-xl bg-[#1a73e8] text-sm font-bold text-white">
              M
            </span>
            <div>
              <h1 className="text-[17px] font-semibold tracking-tight text-[#0f172a]">Maps assistant</h1>
              <p className="text-[12px] text-[#64748b]">
                {signedIn && session?.user.email
                  ? session.user.email
                  : "Directions, places, and nearby search"}
              </p>
            </div>
          </div>
          <nav className="flex flex-wrap items-center gap-2">
            <Link
              href="/maps-usage"
              className={cn(
                buttonVariants({ variant: "outline", size: "sm" }),
                "h-8 rounded-lg border-[#e2e8f0] bg-white text-[12px] text-[#334155]",
              )}
            >
              Usage dashboard
            </Link>
            {signedIn ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void signOut()}
                className="h-8 gap-1.5 rounded-lg border-[#e2e8f0] bg-white text-[12px] text-[#334155]"
              >
                <LogOutIcon className="size-3.5" />
                Sign out
              </Button>
            ) : null}
          </nav>
        </header>

        {!signedIn ? (
          <MapsAuthSignIn className="min-h-[68vh] flex-1" callbackURL="/" />
        ) : !activeThreadId || !activeThread ? (
          <main className="flex flex-1 items-center justify-center">
            <Loader2Icon className="size-6 animate-spin text-[#64748b]" />
          </main>
        ) : (
          <>
            <MapsChatSidebar
              open={sidebarOpen}
              onClose={() => setSidebarOpen(false)}
              searchQuery={searchQuery}
              onSearchQueryChange={setSearchQuery}
              visibleThreads={visibleThreads}
              activeThreadId={activeThreadId}
              onNewChat={handleNewChat}
              onSelectThread={handleSelectThread}
            />

            <div className="flex min-h-0 flex-1 flex-col">
              <div className="min-w-0 flex-1">
                <MapsChatPanel
                  key={activeThreadId}
                  threadId={activeThreadId}
                  initialMessages={activeThread.messages}
                  settings={settings}
                  models={modelOptions}
                  modelsLoading={modelsLoading}
                  modelsMessage={modelsMessage}
                  showModelsAlert={showModelsAlert}
                  onMessagesChange={handleActiveMessagesChange}
                  onOpenSettings={() => {
                    setDraftSettings(settings);
                    setSettingsOpen(true);
                  }}
                  onModelChange={(modelId) => {
                    setSettings((prev) => {
                      const next = { ...prev, model: modelId };
                      if (typeof window !== "undefined") {
                        window.localStorage.setItem(
                          STORAGE_KEY,
                          JSON.stringify(next),
                        );
                      }
                      return next;
                    });
                  }}
                />
              </div>
            </div>
          </>
        )}
      </div>

      <Dialog onOpenChange={setSettingsOpen} open={settingsOpen}>
        <DialogContent className="flex max-h-[90dvh] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
          <div className="shrink-0 space-y-3 bg-popover px-4 pt-4">
            <DialogHeader>
              <DialogTitle>API settings</DialogTitle>
              <DialogDescription>
                The Maps assistant uses the app&apos;s built-in provider by default. Optionally
                connect your own OpenAI-compatible endpoint — stored locally in your browser.
              </DialogDescription>
            </DialogHeader>

            {defaultProvider.defaultConfigured && !draftSettings.baseURL.trim() ? (
              <p className="rounded-lg border border-[#e2e8f0] bg-[#f8fafc] px-3 py-2 text-[12px] text-[#334155]">
                Using the app provider. Leave the URL empty to keep the built-in provider.
              </p>
            ) : null}
          </div>

          <div className="max-h-[calc(90dvh-12rem)] overflow-y-auto overscroll-contain bg-popover px-4 pt-2 pb-3">
            <FieldGroup className="gap-5 pb-0">
            <Field>
              <FieldLabel htmlFor="base-url">Custom provider URL (optional)</FieldLabel>
              <FieldContent>
                <Input
                  id="base-url"
                  onChange={(event) => {
                    setDraftSettings((prev) => ({
                      ...prev,
                      baseURL: event.target.value,
                    }));
                  }}
                  placeholder="https://api.openai.com/v1"
                  value={draftSettings.baseURL}
                />
                <FieldDescription>
                  Public HTTPS endpoint including the API version path (e.g. /v1). Clear to use
                  the built-in provider.
                </FieldDescription>
              </FieldContent>
            </Field>

            <Field>
              <FieldLabel htmlFor="api-key">Custom API key (optional)</FieldLabel>
              <FieldContent>
                <Input
                  id="api-key"
                  onChange={(event) => {
                    setDraftSettings((prev) => ({
                      ...prev,
                      apiKey: event.target.value,
                    }));
                  }}
                  placeholder="sk-..."
                  type="password"
                  value={draftSettings.apiKey}
                />
              </FieldContent>
            </Field>

            <Field>
              <FieldLabel htmlFor="model-id">Default model</FieldLabel>
              <FieldContent>
                <Input
                  id="model-id"
                  onChange={(event) => {
                    setDraftSettings((prev) => ({
                      ...prev,
                      model: event.target.value,
                    }));
                  }}
                  placeholder={DEFAULT_MODEL}
                  value={draftSettings.model}
                />
              </FieldContent>
            </Field>

            <Field>
              <FieldLabel htmlFor="system-prompt">System prompt override</FieldLabel>
              <FieldContent>
                <Textarea
                  className="mb-0 min-h-36 font-mono text-sm"
                  id="system-prompt"
                  onChange={(event) => {
                    setDraftSettings((prev) => ({
                      ...prev,
                      systemPrompt: event.target.value,
                    }));
                  }}
                  placeholder="Leave blank to use the Maps assistant default system prompt."
                  value={draftSettings.systemPrompt}
                />
              </FieldContent>
            </Field>
          </FieldGroup>
          </div>

          <DialogFooter className="mx-0 mb-0 mt-0 shrink-0 gap-0 rounded-b-xl border-t border-border bg-popover !p-0">
            <Button
              onClick={() => {
                setSettingsOpen(false);
              }}
              variant="outline"
              className="my-3 mr-2 mb-3 ml-3 sm:ml-0"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveSettings}
              className="my-3 mr-4 mb-3 bg-[#1a73e8] text-white hover:bg-[#1557b0] hover:text-white"
            >
              Save settings
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
