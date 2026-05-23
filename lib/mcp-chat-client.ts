import { createMCPClient, type MCPClient } from "@ai-sdk/mcp";

const DEFAULT_MCP_CHAT_URL = "http://127.0.0.1:3000/mcp";

export function getMcpChatUrl(): string {
  const raw =
    process.env.MCP_CHAT_URL?.trim() ||
    process.env.NEXT_PUBLIC_MCP_APP_ORIGIN?.trim();

  if (raw) {
    const base = raw.replace(/\/$/, "");
    return base.endsWith("/mcp") ? base : `${base}/mcp`;
  }

  return DEFAULT_MCP_CHAT_URL;
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
