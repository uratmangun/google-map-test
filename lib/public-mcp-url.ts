/** Public MCP HTTP endpoint for clients (Cursor, ChatGPT, Inspector). */
export function getPublicMcpUrl(origin?: string): string {
  const base = (
    process.env.NEXT_PUBLIC_MCP_APP_ORIGIN?.trim() ||
    process.env.NEXT_PUBLIC_GPT_APP_ORIGIN?.trim() ||
    origin?.trim() ||
    ""
  ).replace(/\/$/, "");

  if (!base) return "/mcp";
  return base.endsWith("/mcp") ? base : `${base}/mcp`;
}
