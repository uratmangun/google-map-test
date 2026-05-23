import { xmcpHttpHandler } from "@/lib/mcp/xmcp-http";

export const runtime = "nodejs";

export const GET = xmcpHttpHandler;
export const POST = xmcpHttpHandler;

export async function OPTIONS(): Promise<Response> {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "*",
      "Access-Control-Max-Age": "86400",
    },
  });
}
