"use client";

import { DefaultChatTransport } from "ai";
import { useChat } from "@ai-sdk/react";
import {
  AlertCircleIcon,
  BotIcon,
  CheckIcon,
  CopyIcon,
  ExternalLinkIcon,
  Loader2Icon,
  Settings2Icon,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  PromptInputSelect,
  PromptInputSelectContent,
  PromptInputSelectItem,
  PromptInputSelectTrigger,
  PromptInputSelectValue,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
} from "@/components/ai-elements/prompt-input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Separator } from "@/components/ui/separator";
import type { UiModel } from "@/lib/models";
import { DEFAULT_MODEL } from "@/lib/repo-system-prompt";

type ModelApiResponse = {
  configured: boolean;
  message: string | null;
  data: UiModel[];
};

type ProviderSettings = {
  baseURL: string;
  apiKey: string;
  model: string;
  systemPrompt: string;
};

const STORAGE_KEY = "ai-ide-template-settings-v2";

const FALLBACK_MODELS: UiModel[] = [
  {
    id: DEFAULT_MODEL,
    name: "Titan 5.4",
    provider: "openai",
    providerLabel: "OpenAI-compatible",
  },
];

const suggestedPrompts = [
  "Give me a quick tour of this template and what I should customize first.",
  "How do I clone this template into a private repository with gh CLI?",
  "Show me where to change the system prompt and deployment hostname.",
  "How do I deploy this Next.js app to my VPS with Podman and Cloudflare Tunnel?",
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

function getModelLabel(model: UiModel) {
  return `${model.name} · ${model.providerLabel}`;
}

export function HomePageClient() {
  const [settings, setSettings] = useState<ProviderSettings>(() => loadSettings());
  const [draftSettings, setDraftSettings] = useState<ProviderSettings>(() => loadSettings());
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [models, setModels] = useState<UiModel[]>(FALLBACK_MODELS);
  const [modelsMessage, setModelsMessage] = useState<string | null>(null);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [chatKey, setChatKey] = useState(0);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    if (!copied) {
      return;
    }

    const timer = window.setTimeout(() => {
      setCopied(false);
    }, 1200);

    return () => {
      window.clearTimeout(timer);
    };
  }, [copied]);

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

  const loadModels = useCallback(async (nextSettings: ProviderSettings) => {
    if (!nextSettings.baseURL.trim()) {
      setModels(FALLBACK_MODELS);
      setModelsMessage("Set an OpenAI-compatible URL in settings to load models.");
      return;
    }

    setModelsLoading(true);

    try {
      const response = await fetch("/api/models", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          baseURL: nextSettings.baseURL,
          apiKey: nextSettings.apiKey,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed with status ${response.status}`);
      }

      const payload = (await response.json()) as ModelApiResponse;
      setModels(payload.data.length > 0 ? payload.data : FALLBACK_MODELS);
      setModelsMessage(payload.message ?? null);

      if (payload.data.length > 0 && !payload.data.some((model) => model.id === nextSettings.model)) {
        setSettings((prev) => ({
          ...prev,
          model: payload.data[0].id,
        }));
      }
    } catch {
      setModels(FALLBACK_MODELS);
      setModelsMessage("Could not load models from the configured API.");
    } finally {
      setModelsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadModels(settings);
  }, [loadModels, settings]);

  const chat = useChat({
    id: `template-chat-${chatKey}`,
    transport: new DefaultChatTransport({
      api: "/api/chat",
      body: {
        baseURL: settings.baseURL,
        apiKey: settings.apiKey,
        model: settings.model || DEFAULT_MODEL,
        systemPrompt: settings.systemPrompt,
      },
    }),
  });

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
    setChatKey((value) => value + 1);
    void loadModels(nextSettings);
  }, [draftSettings, loadModels, settings.model]);

  const handleCopyCommand = useCallback(async () => {
    await navigator.clipboard.writeText(
      "gh repo create my-new-repo --template uratmangun/ai-ide-template --private --clone",
    );
    setCopied(true);
  }, []);

  const handleSubmitPrompt = useCallback(
    ({ text }: { text: string }) => {
      const content = text.trim();

      if (!content || chat.status === "submitted" || chat.status === "streaming") {
        return;
      }

      void chat.sendMessage({
        role: "user",
        parts: [
          {
            type: "text",
            text: content,
          },
        ],
      });
    },
    [chat],
  );

  const isSending = chat.status === "submitted" || chat.status === "streaming";

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-4 px-4 py-5 md:px-8 md:py-8">
      <Card className="border-foreground/10 bg-card/80 shadow-lg backdrop-blur">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-col gap-2">
              <Badge variant="secondary">Next.js + AI SDK + Podman</Badge>
              <CardTitle className="text-2xl tracking-tight md:text-3xl">AI IDE Template</CardTitle>
              <CardDescription>
                Clone fast with GitHub CLI, then run this chat shell against any OpenAI-compatible endpoint.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={handleCopyCommand} variant="outline">
                {copied ? <CheckIcon className="size-4" /> : <CopyIcon className="size-4" />}
                {copied ? "Copied" : "Copy clone command"}
              </Button>
              <Button
                onClick={() => {
                  window.open("https://github.com/uratmangun/ai-ide-template", "_blank", "noopener,noreferrer");
                }}
              >
                <ExternalLinkIcon className="size-4" />
                Open repo
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <code className="block rounded-md border border-foreground/10 bg-background/60 px-3 py-2 font-mono text-xs text-foreground/90 md:text-sm">
            gh repo create my-new-repo --template uratmangun/ai-ide-template --private --clone
          </code>
        </CardContent>
      </Card>

      <Card className="flex min-h-[68vh] flex-col border-foreground/10 bg-card/85 shadow-xl backdrop-blur">
        <CardHeader className="border-b border-border/60">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <BotIcon className="size-4 text-primary" />
              <CardTitle className="text-base">Repository assistant</CardTitle>
              <Badge variant="outline">{settings.model || DEFAULT_MODEL}</Badge>
            </div>
            <Button
              onClick={() => {
                setDraftSettings(settings);
                setSettingsOpen(true);
              }}
              size="sm"
              variant="outline"
            >
              <Settings2Icon className="size-4" />
              Provider settings
            </Button>
          </div>
          {modelsMessage ? (
            <Alert>
              <AlertCircleIcon className="size-4" />
              <AlertTitle>Model source</AlertTitle>
              <AlertDescription>{modelsMessage}</AlertDescription>
            </Alert>
          ) : null}
        </CardHeader>

        <CardContent className="flex min-h-0 flex-1 flex-col gap-3 p-0">
          <Conversation>
            <ConversationContent>
              {chat.messages.length === 0 ? (
                <ConversationEmptyState
                  title="Ask about customizing this template"
                  description="Try one of the prompts below or write your own deployment question."
                  icon={<BotIcon className="size-5" />}
                >
                  <div className="grid w-full max-w-3xl gap-2 md:grid-cols-2">
                    {suggestedPrompts.map((prompt) => (
                      <Button
                        className="h-auto justify-start whitespace-normal text-left"
                        key={prompt}
                        onClick={() => {
                          void handleSubmitPrompt({ text: prompt });
                        }}
                        variant="outline"
                      >
                        {prompt}
                      </Button>
                    ))}
                  </div>
                </ConversationEmptyState>
              ) : null}

              {chat.messages.map((message) => (
                <Message from={message.role} key={message.id}>
                  <MessageContent>
                    {message.parts
                      .filter((part) => part.type === "text")
                      .map((part, index) => (
                        <MessageResponse key={`${message.id}-text-${index}`}>{part.text}</MessageResponse>
                      ))}
                  </MessageContent>
                </Message>
              ))}
            </ConversationContent>
            <ConversationScrollButton />
          </Conversation>

          <Separator />

          <div className="p-3 pt-0 md:p-4 md:pt-0">
            <PromptInput onSubmit={handleSubmitPrompt}>
              <PromptInputBody>
                <PromptInputTextarea disabled={isSending} placeholder="Ask about this template, deployment, or customization…" />
              </PromptInputBody>
              <PromptInputFooter>
                <PromptInputTools>
                  <PromptInputSelect
                    disabled={modelsLoading}
                    onValueChange={(value) => {
                      if (value) {
                        setSettings((prev) => ({
                          ...prev,
                          model: typeof value === "string" ? value : String(value),
                        }));
                        setChatKey((current) => current + 1);
                      }
                    }}
                    value={settings.model}
                  >
                    <PromptInputSelectTrigger className="min-w-64 md:min-w-80">
                      {modelsLoading ? (
                        <span className="inline-flex items-center gap-2">
                          <Loader2Icon className="size-3.5 animate-spin" />
                          Loading models
                        </span>
                      ) : (
                        <PromptInputSelectValue placeholder="Select model" />
                      )}
                    </PromptInputSelectTrigger>
                    <PromptInputSelectContent>
                      {modelOptions.map((model) => (
                        <PromptInputSelectItem key={model.id} value={model.id}>
                          {getModelLabel(model)}
                        </PromptInputSelectItem>
                      ))}
                    </PromptInputSelectContent>
                  </PromptInputSelect>
                </PromptInputTools>
                <PromptInputSubmit onStop={() => chat.stop()} status={chat.status} />
              </PromptInputFooter>
            </PromptInput>
          </div>
        </CardContent>
      </Card>

      <Dialog onOpenChange={setSettingsOpen} open={settingsOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Provider settings</DialogTitle>
            <DialogDescription>
              Use a public OpenAI-compatible HTTPS API. Settings are stored locally in your browser.
            </DialogDescription>
          </DialogHeader>

          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="base-url">OpenAI-compatible base URL</FieldLabel>
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
                  Must be a public HTTPS endpoint and should include the provider API version path.
                </FieldDescription>
              </FieldContent>
            </Field>

            <Field>
              <FieldLabel htmlFor="api-key">API key (optional)</FieldLabel>
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
              <FieldLabel htmlFor="system-prompt">System prompt override</FieldLabel>
              <FieldContent>
                <Textarea
                  className="min-h-36 font-mono text-sm"
                  id="system-prompt"
                  onChange={(event) => {
                    setDraftSettings((prev) => ({
                      ...prev,
                      systemPrompt: event.target.value,
                    }));
                  }}
                  placeholder="Leave blank to use the repository default system prompt."
                  value={draftSettings.systemPrompt}
                />
                <FieldDescription>
                  Leave blank to use the default system prompt from this repository.
                </FieldDescription>
              </FieldContent>
            </Field>
          </FieldGroup>

          <DialogFooter>
            <Button
              onClick={() => {
                setSettingsOpen(false);
              }}
              variant="outline"
            >
              Cancel
            </Button>
            <Button onClick={handleSaveSettings}>Save settings</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
