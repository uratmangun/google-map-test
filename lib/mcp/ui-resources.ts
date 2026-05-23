import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { metadata as showDirectionsMetadata } from "@/lib/mcp/show-directions-tool";
import { metadata as showMapMetadata } from "@/lib/mcp/show-map-tool";

import { buildMcpAppWidgetHtml } from "./ui-widget-html";
import {
  MCP_APP_HTML,
  buildResourceUiMeta,
  buildToolUiMeta,
  widgetUri,
} from "./tool-ui-meta";

export type UiWidgetRegistration = {
  toolName: string;
  bundleFile: string;
  description: string;
  toolMetaSource?: typeof showMapMetadata._meta;
};

const SHOW_MAP_BUNDLE = "src_tools_show-map-at-coordinates_3c4ef7.bundle.js";
/** Set after `xmcp build`; hash suffix matches dist/client output. */
const SHOW_DIRECTIONS_BUNDLE =
  "src_tools_show-directions_bdc805.bundle.js";

export const UI_WIDGETS: UiWidgetRegistration[] = [
  {
    toolName: "show-map-at-coordinates",
    bundleFile: SHOW_MAP_BUNDLE,
    description: "Embedded map widget for show-map-at-coordinates",
    toolMetaSource: showMapMetadata._meta,
  },
  {
    toolName: "show-directions",
    bundleFile: SHOW_DIRECTIONS_BUNDLE,
    description: "Embedded directions widget for show-directions",
    toolMetaSource: showDirectionsMetadata._meta,
  },
];

export function registerUiResources(server: McpServer): void {
  for (const widget of UI_WIDGETS) {
    const uri = widgetUri(widget.toolName);
    const resourceMeta = buildResourceUiMeta(
      widget.toolName,
      widget.toolMetaSource,
    );

    server.registerResource(
      widget.toolName,
      uri,
      {
        description: widget.description,
        mimeType: MCP_APP_HTML,
        _meta: resourceMeta,
      },
      async () => ({
        contents: [
          {
            uri,
            mimeType: MCP_APP_HTML,
            text: buildMcpAppWidgetHtml(widget.bundleFile),
          },
        ],
      }),
    );
  }
}

export function toolUiMetaFor(name: string): Record<string, unknown> | undefined {
  const widget = UI_WIDGETS.find((w) => w.toolName === name);
  if (!widget) return undefined;
  return buildToolUiMeta(widget.toolName, widget.toolMetaSource);
}
