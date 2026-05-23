import { readFileSync } from "node:fs";
import path from "node:path";

import { UI_WIDGETS } from "@/lib/mcp/ui-resources";

export const runtime = "nodejs";

const allowed = new Set(UI_WIDGETS.map((w) => w.bundleFile));

export async function GET(
  _request: Request,
  context: { params: Promise<{ filename: string }> },
): Promise<Response> {
  const { filename } = await context.params;
  const decoded = decodeURIComponent(filename);

  if (!allowed.has(decoded)) {
    return new Response("Not found", { status: 404 });
  }

  try {
    const filePath = path.join(process.cwd(), "dist/client", decoded);
    const body = readFileSync(filePath);
    return new Response(body, {
      headers: {
        "Content-Type": "application/javascript; charset=utf-8",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch {
    return new Response("Bundle not built. Run: pnpm exec xmcp build", {
      status: 503,
    });
  }
}
