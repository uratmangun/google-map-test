"use client";

import { type InferSchema } from "xmcp";
import { useMemo } from "react";

import { useToolOutput } from "../../hooks/use-tool-output";
import type { MapToolPayload } from "../../lib/google-maps/show-map-payload";

export {
  metadata,
  outputSchema,
  schema,
} from "../../lib/mcp/show-map-tool";

import { schema as showMapSchema } from "../../lib/mcp/show-map-tool";

type ShowMapInput = InferSchema<typeof showMapSchema>;

const IFRAME_WIDTH = 640;
const IFRAME_HEIGHT = 400;

function resolveMapUrl(value: unknown): string | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  if (typeof v.mapUrl === "string" && v.mapUrl.trim()) return v.mapUrl;
  if (typeof v.embedUrl === "string" && v.embedUrl.trim()) return v.embedUrl;
  return null;
}

function hasMapPayload(value: unknown): value is MapToolPayload {
  return resolveMapUrl(value) !== null;
}

function resolvePayload(
  props: ShowMapInput & Partial<MapToolPayload & { embedUrl?: string }>,
  toolOutput: unknown,
): MapToolPayload | { error: string } | null {
  const fromProps = resolveMapUrl(props);
  if (fromProps) return { mapUrl: fromProps };

  const fromTool = resolveMapUrl(toolOutput);
  if (fromTool) return { mapUrl: fromTool };

  if (toolOutput && typeof toolOutput === "object") {
    const wrapped = toolOutput as { args?: unknown; structuredContent?: unknown };
    const fromArgs = resolveMapUrl(wrapped.args);
    if (fromArgs) return { mapUrl: fromArgs };
    const fromStructured = resolveMapUrl(wrapped.structuredContent);
    if (fromStructured) return { mapUrl: fromStructured };
  }

  if (
    toolOutput &&
    typeof toolOutput === "object" &&
    "error" in toolOutput &&
    typeof (toolOutput as { error: unknown }).error === "string"
  ) {
    return { error: (toolOutput as { error: string }).error };
  }

  return null;
}

function EmbeddedMapView({ mapUrl }: { mapUrl: string }) {
  return (
    <iframe
      src={mapUrl}
      title="Map"
      width={IFRAME_WIDTH}
      height={IFRAME_HEIGHT}
      loading="lazy"
      referrerPolicy="no-referrer-when-downgrade"
      allowFullScreen
      style={{
        width: "100%",
        height: `${IFRAME_HEIGHT}px`,
        maxHeight: "min(70vh, 480px)",
        border: "1px solid #e4e4e7",
        borderRadius: "8px",
        display: "block",
      }}
    />
  );
}

export default function showMapAtCoordinates(
  props: ShowMapInput & Partial<MapToolPayload & { embedUrl?: string }>,
) {
  const toolOutput = useToolOutput<unknown>();
  const resolved = useMemo(
    () => resolvePayload(props, toolOutput),
    [props, toolOutput],
  );

  if (!resolved) {
    return (
      <p style={{ margin: 0, fontSize: "13px", color: "#71717a" }}>
        Loading map…
      </p>
    );
  }

  if ("error" in resolved) {
    return (
      <p style={{ margin: 0, fontSize: "13px", color: "#b91c1c" }}>
        {resolved.error}
      </p>
    );
  }

  return <EmbeddedMapView mapUrl={resolved.mapUrl} />;
}
