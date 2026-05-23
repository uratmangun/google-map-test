import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { z } from "zod";

type XmcpToolEntry = {
  description: string;
  inputSchema: z.ZodObject<z.ZodRawShape>;
  execute: (args: Record<string, unknown>) => Promise<unknown>;
};

let toolsPromise: Promise<Record<string, XmcpToolEntry>> | null = null;

async function loadXmcpTools(): Promise<Record<string, XmcpToolEntry>> {
  if (!toolsPromise) {
    toolsPromise = import("../../.xmcp/tools.js").then((mod) => mod.tools);
  }
  return toolsPromise;
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
      ].join(" "),
    },
  );

  const tools = await loadXmcpTools();
  for (const [name, tool] of Object.entries(tools)) {
    server.registerTool(
      name,
      {
        description: tool.description,
        inputSchema: tool.inputSchema,
      },
      async (args) => normalizeToolResult(await tool.execute(args)),
    );
  }

  return server;
}

/** Materialize JSON bodies so the MCP server can close before the client reads a stream. */
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
