"use client";

import { type InferSchema } from "xmcp";
import { useMemo } from "react";

import { useToolOutput } from "../../hooks/use-tool-output";
import type { DirectionsToolPayload } from "../../lib/google-maps/show-directions-payload";

export {
  metadata,
  outputSchema,
  schema,
} from "../../lib/mcp/show-directions-tool";

import { schema as showDirectionsSchema } from "../../lib/mcp/show-directions-tool";

type ShowDirectionsInput = InferSchema<typeof showDirectionsSchema>;

const IFRAME_WIDTH = 640;
const IFRAME_HEIGHT = 400;

function resolveEmbedUrl(value: unknown): string | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  if (typeof v.embedUrl === "string" && v.embedUrl.trim()) return v.embedUrl;
  const mapUrl = typeof v.mapUrl === "string" ? v.mapUrl.trim() : "";
  if (mapUrl.includes("/maps/embed/")) return mapUrl;
  return null;
}

function resolvePayload(
  props: ShowDirectionsInput & Partial<DirectionsToolPayload>,
  toolOutput: unknown,
): { embedUrl: string } | { error: string } | null {
  const fromProps = resolveEmbedUrl(props);
  if (fromProps) return { embedUrl: fromProps };

  const fromTool = resolveEmbedUrl(toolOutput);
  if (fromTool) return { embedUrl: fromTool };

  if (toolOutput && typeof toolOutput === "object") {
    const wrapped = toolOutput as { args?: unknown; structuredContent?: unknown };
    const fromArgs = resolveEmbedUrl(wrapped.args);
    if (fromArgs) return { embedUrl: fromArgs };
    const fromStructured = resolveEmbedUrl(wrapped.structuredContent);
    if (fromStructured) return { embedUrl: fromStructured };
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

function EmbeddedDirectionsView({ mapUrl }: { mapUrl: string }) {
  return (
    <iframe
      src={mapUrl}
      title="Directions"
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

export default function showDirections(
  props: ShowDirectionsInput & Partial<DirectionsToolPayload>,
) {
  const toolOutput = useToolOutput<unknown>();
  const resolved = useMemo(
    () => resolvePayload(props, toolOutput),
    [props, toolOutput],
  );

  if (!resolved) {
    return (
      <p style={{ margin: 0, fontSize: "13px", color: "#71717a" }}>
        Loading directions…
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

  return <EmbeddedDirectionsView mapUrl={resolved.embedUrl} />;
}
