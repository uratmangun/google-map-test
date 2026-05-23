"use client";

import { useEffect, useState } from "react";

declare global {
  interface Window {
    openai?: {
      toolOutput?: unknown;
      toolInput?: unknown;
      callTool?: (
        name: string,
        args: Record<string, unknown>,
      ) => Promise<{ structuredContent?: unknown } | null>;
    };
  }
}

const SET_GLOBALS_EVENT = "openai:set_globals";

function readToolOutput<T>(): T | null {
  if (typeof window === "undefined") return null;
  const raw = window.openai?.toolOutput;
  if (raw === undefined || raw === null) return null;
  return raw as T;
}

function structuredFromMessage(data: unknown): unknown | null {
  if (!data || typeof data !== "object") return null;
  const msg = data as {
    method?: string;
    params?: { structuredContent?: unknown };
  };
  if (msg.method !== "ui/notifications/tool-result") return null;
  return msg.params?.structuredContent ?? null;
}

/**
 * Read the current tool's structuredContent from the ChatGPT Apps SDK host.
 */
export function useToolOutput<T>(): T | null {
  const [output, setOutput] = useState<T | null>(null);

  useEffect(() => {
    const apply = (value: unknown) => {
      if (value !== undefined && value !== null) {
        setOutput(value as T);
      }
    };

    apply(readToolOutput());

    const onGlobals = (event: Event) => {
      const detail = (
        event as CustomEvent<{ globals?: { toolOutput?: unknown } }>
      ).detail;
      apply(detail?.globals?.toolOutput ?? readToolOutput());
    };

    const onMessage = (event: MessageEvent) => {
      apply(structuredFromMessage(event.data));
    };

    window.addEventListener(SET_GLOBALS_EVENT, onGlobals, { passive: true });
    window.addEventListener("message", onMessage);
    return () => {
      window.removeEventListener(SET_GLOBALS_EVENT, onGlobals);
      window.removeEventListener("message", onMessage);
    };
  }, []);

  return output;
}
