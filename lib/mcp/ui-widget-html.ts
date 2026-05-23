import { readFileSync } from "node:fs";
import path from "node:path";

export function readClientBundle(bundleFileName: string): string {
  const bundlePath = path.join(process.cwd(), "dist/client", bundleFileName);
  return readFileSync(bundlePath, "utf8");
}

function escapeInlineScript(source: string): string {
  return source.replace(/<\/script/gi, "<\\/script");
}

/** HTML shell with inlined xmcp client bundle (avoids sandbox CSP blocking external script URLs). */
export function buildMcpAppWidgetHtml(bundleFileName: string): string {
  const bundle = escapeInlineScript(readClientBundle(bundleFileName));

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>MCP App</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module">${bundle}</script>
  </body>
</html>`;
}
