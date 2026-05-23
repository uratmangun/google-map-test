/**
 * xmcp 0.6.10 Next adapter bundle assigns module.exports=c (wrong variable).
 * Optional patch — the app uses lib/mcp/xmcp-http.ts instead of @xmcp/adapter.
 */
import fs from "node:fs";
import path from "node:path";

const adapterPath = path.join(process.cwd(), ".xmcp/adapter/index.js");

if (!fs.existsSync(adapterPath)) {
  console.warn("[patch-xmcp-adapter] No .xmcp/adapter/index.js — run xmcp build first.");
  process.exit(0);
}

let source = fs.readFileSync(adapterPath, "utf8");
const marker = "var o={};return(()=>{let e,t,s,c,l,p;n.r(o),n.d(o,{xmcpHandler:";
if (!source.includes(marker)) {
  console.warn("[patch-xmcp-adapter] Bundle format changed; skip.");
  process.exit(0);
}

source = source.replace(
  marker,
  "var __xmcp_exports__={};return(()=>{let e,t,s,c,l,p;n.r(__xmcp_exports__),n.d(__xmcp_exports__,{xmcpHandler:",
);
source = source.replace(
  "}})(),o})())),module.exports=c})();",
  "}})(),__xmcp_exports__})())),module.exports=__xmcp_exports__})();",
);

fs.writeFileSync(adapterPath, source);
console.log("[patch-xmcp-adapter] Patched .xmcp/adapter/index.js");
