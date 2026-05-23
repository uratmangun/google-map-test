import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

import { buildShowMapToolResult } from "@/lib/google-maps/show-map-payload";
import {
  metadata as showMapMetadata,
  schema as showMapSchema,
} from "@/lib/mcp/show-map-tool";
import { registerUiResources, toolUiMetaFor } from "@/lib/mcp/ui-resources";

type XmcpToolEntry = {
  description: string;
  inputSchema: z.ZodObject<z.ZodRawShape>;
  _meta?: Record<string, unknown>;
  execute: (args: Record<string, unknown>) => Promise<unknown>;
};

function asExecute(
  fn: (args: Record<string, unknown>) => Promise<unknown>,
): (args: Record<string, unknown>) => Promise<unknown> {
  return fn;
}

let toolsPromise: Promise<Record<string, XmcpToolEntry>> | null = null;

async function loadXmcpTools(): Promise<Record<string, XmcpToolEntry>> {
  if (!toolsPromise) {
    toolsPromise = (async () => {
      const searchPlace = await import("@/src/tools/search-place");

      return {
        "search-place": {
          description: searchPlace.metadata.description,
          inputSchema: z.object(searchPlace.schema),
          execute: asExecute(
            searchPlace.default as (
              args: Record<string, unknown>,
            ) => Promise<unknown>,
          ),
        },
        "show-map-at-coordinates": {
          description: showMapMetadata.description,
          inputSchema: z.object(showMapSchema),
          _meta: toolUiMetaFor("show-map-at-coordinates"),
          execute: async () => ({}),
        },
      };
    })();
  }
  return toolsPromise as Promise<Record<string, XmcpToolEntry>>;
}

function normalizeToolResult(result: unknown): CallToolResult {
  if (typeof result === "string") {
    return { content: [{ type: "text", text: result }] };
  }
  if (typeof result === "number") {
    return { content: [{ type: "text", text: String(result) }] };
  }
  if (result && typeof result === "object") {
    return result as CallToolResult;
  }
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(result ?? null, null, 2),
      },
    ],
  };
}

async function createMcpServer(): Promise<McpServer> {
  const server = new McpServer(
    {
      name: "google-maps-mcp",
      version: "0.1.0",
    },
    {
      instructions: [
        "Use search-place when the user needs a location, address, coordinates, or map center.",
        "Pass a clear place query (landmark + city, business name, or address).",
        "The tool returns a human summary plus structured JSON with primary and alternate matches.",
        "Use show-map-at-coordinates after search-place to render a map at primary.latitude/longitude.",
      ].join(" "),
      capabilities: {
        tools: { listChanged: true },
        resources: { listChanged: true, subscribe: false },
      },
    },
  );

  registerUiResources(server);

  const tools = await loadXmcpTools();
  for (const [name, tool] of Object.entries(tools)) {
    server.registerTool(
      name,
      {
        description: tool.description,
        inputSchema: tool.inputSchema,
        _meta: tool._meta,
      },
      async (args) => {
        if (name === "show-map-at-coordinates") {
          const latitude = Number(args.latitude);
          const longitude = Number(args.longitude);
          if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
            return normalizeToolResult({
              content: [
                {
                  type: "text",
                  text: JSON.stringify(
                    { error: "latitude and longitude are required." },
                    null,
                    2,
                  ),
                },
              ],
              isError: true,
            });
          }
          try {
            const result = await buildShowMapToolResult({
              latitude,
              longitude,
              zoom:
                args.zoom !== undefined ? Number(args.zoom) : undefined,
              maptype:
                typeof args.maptype === "string"
                  ? (args.maptype as
                      | "roadmap"
                      | "satellite"
                      | "terrain"
                      | "hybrid")
                  : undefined,
            });
            const uiMeta = toolUiMetaFor("show-map-at-coordinates");
            return normalizeToolResult({
              ...result,
              _meta: uiMeta,
            });
          } catch (err) {
            const message =
              err instanceof Error
                ? err.message
                : "Static map request failed.";
            return normalizeToolResult({
              content: [
                {
                  type: "text",
                  text: JSON.stringify(
                    { error: message, latitude, longitude },
                    null,
                    2,
                  ),
                },
              ],
              isError: true,
            });
          }
        }
        return normalizeToolResult(await tool.execute(args));
      },
    );
  }

  return server;
}

async function bufferResponse(response: Response): Promise<Response> {
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("text/event-stream") || !response.body) {
    return response;
  }
  const body = await response.arrayBuffer();
  return new Response(body, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
}

function statelessGetResponse(): Response {
  return new Response(
    JSON.stringify({
      jsonrpc: "2.0",
      error: {
        code: -32000,
        message:
          "Stateless MCP: send JSON-RPC messages via POST. SSE GET is not enabled on this server.",
      },
      id: null,
    }),
    {
      status: 405,
      headers: {
        "Content-Type": "application/json",
        Allow: "POST, OPTIONS",
      },
    },
  );
}

let requestChain: Promise<void> = Promise.resolve();

export async function xmcpHttpHandler(request: Request): Promise<Response> {
  if (request.method === "GET") {
    return statelessGetResponse();
  }

  const run = async (): Promise<Response> => {
    const server = await createMcpServer();
    const transport = new WebStandardStreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    });

    try {
      await server.connect(transport);
      const response = await transport.handleRequest(request);
      return await bufferResponse(response);
    } finally {
      await server.close();
    }
  };

  const responsePromise = requestChain.then(run, run);
  requestChain = responsePromise.then(
    () => undefined,
    () => undefined,
  );
  return responsePromise;
}
