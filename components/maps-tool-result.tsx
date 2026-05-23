"use client";

import { ToolOutput } from "@/components/ai-elements/tool";
import type { MapsToolPart } from "@/lib/maps-chat-shared";
import { getToolName } from "@/lib/maps-chat-shared";

type MapPayload = {
  center?: { latitude: number; longitude: number };
  zoom?: number;
  maptype?: string;
  embedUrl?: string;
  mapsUrl?: string;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object") return null;
  return value as Record<string, unknown>;
}

function parseMapPayload(output: unknown): MapPayload | null {
  const root = asRecord(output);
  if (!root) return null;

  const structured =
    asRecord(root.structuredContent) ??
    asRecord(root.structured_content) ??
    asRecord(root.args) ??
    root;

  const centerRaw = structured.center;
  const center =
    centerRaw &&
    typeof centerRaw === "object" &&
    typeof (centerRaw as { latitude?: unknown }).latitude === "number" &&
    typeof (centerRaw as { longitude?: unknown }).longitude === "number"
      ? {
          latitude: (centerRaw as { latitude: number }).latitude,
          longitude: (centerRaw as { longitude: number }).longitude,
        }
      : undefined;

  const embedUrl =
    typeof structured.embedUrl === "string" ? structured.embedUrl : undefined;
  const mapsUrl =
    typeof structured.mapsUrl === "string" ? structured.mapsUrl : undefined;

  if (!embedUrl && !center) {
    return null;
  }

  return {
    center,
    zoom: typeof structured.zoom === "number" ? structured.zoom : undefined,
    maptype: typeof structured.maptype === "string" ? structured.maptype : undefined,
    embedUrl,
    mapsUrl,
  };
}

function parseSearchPlaces(output: unknown): unknown {
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
        try {
          return JSON.parse(block.text) as unknown;
        } catch {
          return block.text;
        }
      }
    }
  }

  return output;
}

function MapEmbedPreview({ payload }: { payload: MapPayload }) {
  if (!payload.embedUrl) {
    return null;
  }

  return (
    <div className="flex flex-col gap-2">
      <iframe
        src={payload.embedUrl}
        title={
          payload.center
            ? `Map at ${payload.center.latitude.toFixed(5)}, ${payload.center.longitude.toFixed(5)}`
            : "Map preview"
        }
        width={640}
        height={400}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        allowFullScreen
        className="h-[min(70vh,360px)] w-full rounded-lg border border-[#e2e8f0]"
      />
      {payload.center ? (
        <p className="text-xs text-[#64748b]">
          Center: {payload.center.latitude.toFixed(5)},{" "}
          {payload.center.longitude.toFixed(5)}
          {payload.zoom !== undefined ? ` · zoom ${payload.zoom}` : null}
          {payload.maptype ? ` · ${payload.maptype}` : null}
        </p>
      ) : null}
      {payload.mapsUrl ? (
        <a
          href={payload.mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-semibold text-[#1a73e8] hover:underline"
        >
          Open in Google Maps
        </a>
      ) : null}
    </div>
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

  if (toolName === "show-map-at-coordinates") {
    const mapPayload = parseMapPayload(part.output);
    if (mapPayload?.embedUrl) {
      return (
        <div className="space-y-3">
          <MapEmbedPreview payload={mapPayload} />
          <ToolOutput output={part.output} />
        </div>
      );
    }
  }

  if (toolName === "search-place") {
    const places = parseSearchPlaces(part.output);
    return <ToolOutput output={places} />;
  }

  return <ToolOutput output={part.output} />;
}
