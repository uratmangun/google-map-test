import type { ToolMetadata } from "xmcp";

const MCP_APP_HTML = "text/html;profile=mcp-app";

function publicOrigin(): string {
  const raw =
    process.env.NEXT_PUBLIC_GPT_APP_ORIGIN ??
    process.env.NEXT_PUBLIC_MCP_APP_ORIGIN ??
    "http://localhost:3000";
  return raw.replace(/\/$/, "");
}

export function widgetUri(toolName: string): string {
  return `ui://app/${toolName}.html`;
}

/** Tool + resource _meta for MCP Apps and ChatGPT Apps SDK. */
export function buildToolUiMeta(
  toolName: string,
  source?: ToolMetadata["_meta"],
): Record<string, unknown> {
  const uri = widgetUri(toolName);
  const openai =
    source && typeof source.openai === "object" && source.openai !== null
      ? (source.openai as Record<string, unknown>)
      : {};

  return {
    ui: {
      resourceUri: uri,
      prefersBorder: true,
      ...(source && typeof source.ui === "object" && source.ui !== null
        ? source.ui
        : {}),
    },
    openai: {
      widgetAccessible: true,
      resultCanProduceWidget: true,
      outputTemplate: uri,
      ...openai,
      widgetCSP: {
        ...(openai.widgetCSP &&
        typeof openai.widgetCSP === "object" &&
        openai.widgetCSP !== null
          ? (openai.widgetCSP as Record<string, unknown>)
          : {}),
        connect_domains: [
          publicOrigin(),
          ...(((openai.widgetCSP as { connect_domains?: string[] })
            ?.connect_domains) ?? []),
        ],
      },
    },
    "openai/outputTemplate": uri,
  };
}

export function buildResourceUiMeta(
  toolName: string,
  source?: ToolMetadata["_meta"],
): Record<string, unknown> {
  const toolMeta = buildToolUiMeta(toolName, source) as {
    ui?: Record<string, unknown>;
    openai?: Record<string, unknown>;
  };

  return {
    ui: toolMeta.ui,
    openai: toolMeta.openai,
  };
}

export { MCP_APP_HTML };
