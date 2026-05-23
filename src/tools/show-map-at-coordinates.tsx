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

function hasMapPayload(value: unknown): value is MapToolPayload {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  if (typeof v.error === "string") return false;
  return (
    typeof v.embedUrl === "string" &&
    v.center !== null &&
    typeof v.center === "object"
  );
}

function resolvePayload(
  props: ShowMapInput & Partial<MapToolPayload>,
  toolOutput: unknown,
): MapToolPayload | { error: string } | null {
  if (hasMapPayload(props)) return props;
  if (hasMapPayload(toolOutput)) return toolOutput;

  if (toolOutput && typeof toolOutput === "object") {
    const wrapped = toolOutput as { args?: unknown };
    if (hasMapPayload(wrapped.args)) return wrapped.args;
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

function EmbeddedMapView({ payload }: { payload: MapToolPayload }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        width: "100%",
        maxWidth: "640px",
        fontFamily:
          'ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',
        fontSize: "14px",
        color: "#18181b",
      }}
    >
      <iframe
        src={payload.embedUrl}
        title={`Map pin at ${payload.center.latitude.toFixed(5)}, ${payload.center.longitude.toFixed(5)}`}
        width={payload.size.width}
        height={payload.size.height}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        allowFullScreen
        style={{
          width: "100%",
          height: `${payload.size.height}px`,
          maxHeight: "min(70vh, 480px)",
          border: "1px solid #e4e4e7",
          borderRadius: "8px",
          display: "block",
        }}
      />
      <dl
        style={{
          display: "grid",
          gridTemplateColumns: "auto 1fr",
          gap: "4px 12px",
          margin: 0,
          fontSize: "12px",
          color: "#52525b",
        }}
      >
        <dt style={{ fontWeight: 600 }}>Center</dt>
        <dd style={{ margin: 0 }}>
          {payload.center.latitude.toFixed(5)},{" "}
          {payload.center.longitude.toFixed(5)}
        </dd>
        <dt style={{ fontWeight: 600 }}>Zoom</dt>
        <dd style={{ margin: 0 }}>{payload.zoom}</dd>
        <dt style={{ fontWeight: 600 }}>Type</dt>
        <dd style={{ margin: 0 }}>{payload.maptype}</dd>
      </dl>
      <a
        href={payload.mapsUrl}
        target="_blank"
        rel="noopener noreferrer"
        style={{ fontSize: "12px", fontWeight: 600, color: "#0369a1" }}
      >
        Open in Google Maps
      </a>
    </div>
  );
}

export default function showMapAtCoordinates(
  props: ShowMapInput & Partial<MapToolPayload>,
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

  return <EmbeddedMapView payload={resolved} />;
}
