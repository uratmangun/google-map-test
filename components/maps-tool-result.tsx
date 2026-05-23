"use client";

import { ToolOutput } from "@/components/ai-elements/tool";
import type { MapsToolPart } from "@/lib/maps-chat-shared";
import { getToolName } from "@/lib/maps-chat-shared";

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object") return null;
  return value as Record<string, unknown>;
}

function resolveMapUrl(output: unknown): string | null {
  const root = asRecord(output);
  if (!root) return null;

  const structured =
    asRecord(root.structuredContent) ??
    asRecord(root.structured_content) ??
    asRecord(root.args) ??
    root;

  if (typeof structured.mapUrl === "string" && structured.mapUrl.trim()) {
    return structured.mapUrl;
  }
  if (typeof structured.embedUrl === "string" && structured.embedUrl.trim()) {
    return structured.embedUrl;
  }
  return null;
}

function parseToolTextOutput(output: unknown): unknown {
  const root = asRecord(output);
  if (!root) return output;

  if (root.structuredContent !== undefined) {
    return root.structuredContent;
  }

  const content = root.content;
  if (Array.isArray(content)) {
    for (const item of content) {
      const block = asRecord(item);
      if (block?.type === "text" && typeof block.text === "string") {
        return block.text;
      }
    }
  }

  return output;
}

function MapEmbedPreview({
  mapUrl,
  title = "Map preview",
}: {
  mapUrl: string;
  title?: string;
}) {
  return (
    <iframe
      src={mapUrl}
      title={title}
      width={640}
      height={400}
      loading="lazy"
      referrerPolicy="no-referrer-when-downgrade"
      allowFullScreen
      className="h-[min(70vh,360px)] w-full rounded-lg border border-[#e2e8f0]"
    />
  );
}

export function MapsToolResult({ part }: { part: MapsToolPart }) {
  const toolName = getToolName(part);

  if (part.state === "output-error") {
    return <ToolOutput errorText={part.errorText} />;
  }

  if (part.state !== "output-available") {
    return null;
  }

  if (toolName === "show-map-at-coordinates" || toolName === "show-directions") {
    const mapUrl = resolveMapUrl(part.output);
    if (mapUrl) {
      return (
        <MapEmbedPreview
          mapUrl={mapUrl}
          title={toolName === "show-directions" ? "Directions preview" : "Map preview"}
        />
      );
    }
  }

  if (toolName === "search-place" || toolName === "get-place-detail") {
    const textOrData = parseToolTextOutput(part.output);
    return <ToolOutput output={textOrData} />;
  }

  return <ToolOutput output={part.output} />;
}
