import { createMCPClient, type MCPClient } from "@ai-sdk/mcp";

function isLoopbackUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    return host === "localhost" || host === "127.0.0.1" || host === "::1";
  } catch {
    return false;
  }
}

/** Server-side MCP URL for /api/chat (same process, often pod hostname not loopback). */
function resolveInternalMcpUrl(): string {
  const port = process.env.PORT?.trim() || "3000";
  const host =
    process.env.MCP_INTERNAL_HOST?.trim() ||
    (process.env.NODE_ENV === "production" ? "termux-stack" : "127.0.0.1");
  return `http://${host}:${port}/mcp`;
}

export function getMcpChatUrl(): string {
  const raw = process.env.MCP_CHAT_URL?.trim();

  if (raw) {
    const base = raw.replace(/\/$/, "");
    const url = base.endsWith("/mcp") ? base : `${base}/mcp`;
    // In Podman pods Next often binds to pod IP only — 127.0.0.1:PORT refuses connections.
    if (process.env.NODE_ENV === "production" && isLoopbackUrl(url)) {
      return resolveInternalMcpUrl();
    }
    return url;
  }

  return resolveInternalMcpUrl();
}

export async function createMapsMcpClient(): Promise<MCPClient> {
  return createMCPClient({
    transport: {
      type: "http",
      url: getMcpChatUrl(),
    },
    clientName: "google-map-test-chat",
  });
}

export async function getMcpToolsForChat(): Promise<{
  client: MCPClient;
  tools: Awaited<ReturnType<MCPClient["tools"]>>;
}> {
  const client = await createMapsMcpClient();
  const tools = await client.tools();
  return { client, tools };
}
