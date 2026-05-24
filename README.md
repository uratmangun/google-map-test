# Google Maps MCP Assistant

Next.js app with a Maps-focused chat UI, an HTTP MCP server at `/mcp`, and optional **MCP Apps** widgets (embedded Google Maps iframes). Tools live in `src/tools/` and are built with [xmcp](https://xmcp.dev/).

## Quick start

```bash
pnpm install
cp .env.example .env.local   # if present; otherwise create .env.local — see below
pnpm dev
```

- App: `http://localhost:3000`
- MCP: `http://localhost:3000/mcp`
- Usage dashboard: `http://localhost:3000/maps-usage` (requires Google sign-in)

`pnpm dev` runs `xmcp dev` (watches `src/tools/`) and `next dev` together. Production: `pnpm build` runs `xmcp build` then `next build`.

More detail: [`docs/mcp-maps.md`](docs/mcp-maps.md), [`docs/google-maps-api-key.md`](docs/google-maps-api-key.md).

---

## Google Cloud: APIs and keys

Billing must be enabled on your GCP project. All MCP tools use one server API key.

### APIs to enable

Enable these on the project ([APIs & Services → Library](https://console.cloud.google.com/apis/library)):

| API | Service name (Monitoring) | Used by |
|-----|---------------------------|---------|
| **Places API (New)** | `places.googleapis.com` | `search-place`, `get-place-detail` |
| **Maps Embed API** | `maps-embed-backend.googleapis.com` | `show-map-at-coordinates`, `show-directions`, `show-street-view` |

```bash
gcloud services enable places.googleapis.com maps-embed-backend.googleapis.com --project=YOUR_PROJECT_ID
```

### API key (tool calls)

1. [Credentials](https://console.cloud.google.com/apis/credentials) → **Create credentials** → **API key**.
2. Under **API restrictions**, restrict the key to at least:
   - Places API (New)
   - Maps Embed API
3. Under **Application restrictions**, set HTTP referrers for local dev and production (e.g. `http://localhost:3000/*`, your public origin).

Or run the helper script (after `gcloud auth login`):

```bash
fish scripts/google-maps-api-key.fish --project YOUR_PROJECT_ID
```

### Environment variables

```env
# Required for all MCP tools
GOOGLE_MAPS_API_KEY=your-server-key
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your-key   # same key if widgets load in browser

# Quota dashboard + Monitoring (same project as the API key)
GCP_PROJECT_ID=your-project-id

# Optional: block MCP when free tier appears exhausted (default: on)
MAPS_QUOTA_GUARD=true

# Optional: Essentials free cap fallback for Places (default 10000)
MAPS_FREE_TIER_ESSENTIALS_LIMIT=10000

# Chat → MCP (default)
MCP_CHAT_URL=http://127.0.0.1:3000/mcp  # local dev; VPS uses http://termux-stack:3004/mcp

# /maps-usage sign-in (Better Auth + Google OAuth)
BETTER_AUTH_URL=http://localhost:3000
BETTER_AUTH_SECRET=...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
```

### Application Default Credentials (usage dashboard only)

`/maps-usage` reads **Cloud Monitoring** request counts. The Next.js server needs ADC with permission to query metrics on `GCP_PROJECT_ID`:

```bash
gcloud auth application-default login
```

The signed-in user/service account needs a role that can read Monitoring data (e.g. *Monitoring Viewer*) on that project. This is **separate** from `GOOGLE_MAPS_API_KEY` — the key does not power the dashboard.

---

## Current tools

| Tool | Type | Google API | Output (LLM) |
|------|------|------------|----------------|
| `search-place` | Regular | Places (New) Text Search | TOON: one `place` + `pagination` |
| `get-place-detail` | Regular | Places (New) Details | TOON: address, rating, contact, `mapsUrl` |
| `show-map-at-coordinates` | MCP App | Maps Embed (`place` mode) | TOON: `mapUrl` only + iframe widget |
| `show-directions` | MCP App | Maps Embed (`directions` mode) | TOON: `mapUrl` only + iframe widget |
| `show-street-view` | MCP App | Maps Embed (`streetview` mode) | TOON: `mapUrl` only + iframe widget |

Typical flow: `search-place` → `get-place-detail` (optional) → a `show-*` tool with coordinates from the place result.

---

## Creating a tool in `src/tools/`

xmcp expects each tool file to export:

- `schema` — Zod field map (inputs)
- `metadata` — `ToolMetadata` (name, description, annotations)
- `default` — async handler **or** a React widget default export for MCP Apps

After adding or changing tools:

```bash
pnpm exec xmcp build
node scripts/patch-xmcp-adapter.mjs
```

Restart `pnpm dev` or rely on `xmcp dev` watch.

### Option A — Regular tool (server handler in `src/tools/`)

Use when the tool calls Google APIs and returns **text/TOON** only (no custom iframe UI).

**Example:** `src/tools/search-place.ts`, `src/tools/get-place-detail.ts`

```ts
import { type InferSchema, type ToolMetadata } from "xmcp";
import { z } from "zod";

export const schema = {
  query: z.string().min(1).describe("What to search for"),
};

export const metadata: ToolMetadata = {
  name: "my-tool",
  description: "What the model should know about this tool",
  annotations: { title: "My tool", readOnlyHint: true },
};

export default async function myTool({ query }: InferSchema<typeof schema>) {
  // 1. await assertMcpQuotaAvailable("my-tool") in your lib/* helper
  // 2. call Google APIs
  // 3. return MCP result shape, e.g. { content: [{ type: "text", text: toon }] }
}
```

**Register in** `lib/mcp/xmcp-http.ts` inside `loadXmcpTools()`:

```ts
const myTool = await import("@/src/tools/my-tool");
return {
  "my-tool": {
    description: myTool.metadata.description,
    inputSchema: z.object(myTool.schema),
    execute: asExecute(myTool.default as (args) => Promise<unknown>),
  },
};
```

**Also update (quota & dashboard):**

1. `lib/maps-free-tier.ts` — add to `MCP_MAPS_TOOL_NAMES` and the correct service’s `mcpTools` array (`places` or `maps-embed`).
2. `lib/maps-skus.ts` — add the tool to the right SKU’s `mcpTools` (and set `freeTierLimit` / pricing if it’s a new billable SKU).
3. Call `assertMcpQuotaAvailable("my-tool")` before the Google request (see `lib/google-maps/places.ts`).
4. `lib/maps-system-prompt.ts` — mention the tool in the workflow string.
5. `lib/maps-chat-shared.ts` — `TOOL_TITLES` entry for the chat UI.
6. `components/maps-tool-result.tsx` — render tool output if it needs custom UI (otherwise default `ToolOutput`).

### Option B — MCP App tool (embed widget + payload in `lib/`)

Use when you want an **interactive iframe** in ChatGPT Apps / MCP hosts and a minimal TOON payload (`mapUrl` only).

**Pattern in this repo:**

| Layer | File | Role |
|-------|------|------|
| Widget | `src/tools/show-*.tsx` | React iframe; reads `mapUrl` from tool output via `useToolOutput` |
| Schema / MCP meta | `lib/mcp/show-*-tool.ts` | `schema`, `metadata` (includes `openai` widget CSP) |
| Server result | `lib/google-maps/show-*-payload.ts` | Builds embed URL, `assertMcpQuotaAvailable`, `formatMapUrlToon(mapUrl)` |
| HTTP handler | `lib/mcp/xmcp-http.ts` | Special-case `name === "show-..."` → `buildShow*ToolResult()` + `toolUiMetaFor()` |
| Widget bundle | `lib/mcp/ui-resources.ts` | `UI_WIDGETS` entry with `dist/client/*.bundle.js` filename from `xmcp build` |
| Embed URL | `lib/google-maps/embed-map.ts` | `buildEmbed*Url()` helpers |

**Steps for a new embed tool:**

1. Add `buildEmbedMyModeUrl()` in `lib/google-maps/embed-map.ts` (Maps Embed docs: [embedding a map](https://developers.google.com/maps/documentation/embed/embedding-map)).
2. Add `lib/google-maps/show-my-tool-payload.ts` with `assertMcpQuotaAvailable("show-my-tool")` and `formatMapUrlToon(mapUrl)` in `content`.
3. Add `lib/mcp/show-my-tool.ts` (`schema`, `metadata` with widget CSP domains).
4. Copy `src/tools/show-map-at-coordinates.tsx` → `src/tools/show-my-tool.tsx` and adjust imports.
5. Register in `xmcp-http.ts` (like `show-directions`), `ui-resources.ts` (run `xmcp build`, copy bundle filename from `dist/client/`).
6. Update quota files and `maps-tool-result.tsx` (treat like other `show-*` tools: iframe when `mapUrl` is present).
7. `components/maps-tool-result.tsx` — add tool name to the embed iframe branch.

Embed tools use **`execute: async () => ({})`** in `loadXmcpTools()` because the real work runs in the `registerTool` callback in `xmcp-http.ts`.

### TOON output

Place/search tools encode structured data with `@toon-format/toon` via helpers in `lib/google-maps/toon.ts`. Embed tools only return:

```toon
mapUrl: https://www.google.com/maps/embed/v1/...
```

---

## How `/maps-usage` works

**Page:** `app/maps-usage/page.tsx` → `components/maps-quota-dashboard.tsx`

**API:** `GET /api/maps/usage` (requires session via `requireApiSession`)

| Request | Response |
|---------|----------|
| No `?service=` | Metadata: project id, Pacific billing month window, list of services from `MAPS_SERVICES` |
| `?service=places` or `?service=maps-embed` | Usage for that service: Monitoring request count + per-SKU breakdown |

**Data source:** `lib/gcp-monitoring.ts` queries Cloud Monitoring:

- Metric: `serviceruntime.googleapis.com/api/request_count`
- Resource: `consumed_api` with `resource.label.service` = e.g. `places.googleapis.com`

Counts are summed for the **current calendar month (Pacific time)** — same window as `getPacificMonthWindow()` in `lib/maps-free-tier.ts`.

**SKU rows** come from `lib/maps-skus.ts` (`SKUS_BY_SERVICE_ID`). Each SKU lists which MCP tools bill against it (`mcpTools`). The UI shows:

- Service card: label, GCP service hostname, linked MCP tool names
- Per-SKU: free tier cap, used vs limit, “at limit” state, estimated overage USD

**Note:** Monitoring reports **API-level** request counts. Multiple tools sharing one service (e.g. three embed tools on `maps-embed-backend.googleapis.com`) share one counter — the guard and dashboard are conservative.

Definitions stay in sync with tools via `lib/maps-free-tier.ts` and `lib/maps-skus.ts`.

---

## How `lib/maps-quota-guard.ts` works

`assertMcpQuotaAvailable(tool)` runs **before** Google API calls (in `lib/google-maps/*` helpers).

1. **Enabled?** Skips if `MAPS_QUOTA_GUARD=false` or `0`.
2. **Resolve SKUs** — `getSkusForMcpTool(tool)` from `lib/maps-skus.ts`.
3. **Resolve GCP service** — `serviceIdForMcpTool(tool)`:
   - `search-place`, `get-place-detail` → `places` (`places.googleapis.com`)
   - `show-map-at-coordinates`, `show-directions`, `show-street-view` → `maps-embed` (`maps-embed-backend.googleapis.com`)
4. **Fetch usage** — same Monitoring query as the dashboard for that service and month.
5. **Check limits** — for each SKU, `skuUsageFromApiRequests()`:
   - `freeTierLimit: null` → treated as **unlimited** (Maps Embed Essentials in this app); never blocks.
   - finite limit (Places Essentials, 10k/mo by default) → `atLimit` when `used >= limit`.
6. **Throw** — if at limit, the MCP tool fails with a message pointing to `/maps-usage`.

Embed tools are guarded but effectively never blocked while Embed remains unlimited on Essentials. Places tools can be blocked after the monthly free cap.

---

## Project layout (tools-related)

```
src/tools/                    # xmcp tool entrypoints (.ts or .tsx)
lib/google-maps/              # Google API clients, embed URLs, payloads
lib/mcp/
  xmcp-http.ts                # MCP server + tool registration
  ui-resources.ts             # MCP Apps widget bundles
  show-*-tool.ts              # schema/metadata for embed tools
lib/maps-free-tier.ts         # services + MCP tool list (usage UI)
lib/maps-skus.ts              # SKU caps, pricing, tool → SKU mapping
lib/maps-quota-guard.ts       # pre-call quota check
lib/gcp-monitoring.ts         # Monitoring queries for /maps-usage
app/mcp/route.ts              # POST/GET → xmcpHttpHandler
app/api/maps/usage/route.ts   # authenticated usage API
components/maps-tool-result.tsx
components/maps-quota-dashboard.tsx
```

---

## Scripts

| Script | Description |
|--------|-------------|
| `pnpm dev` | `xmcp dev` + `next dev` |
| `pnpm build` | `xmcp build` + patch adapter + `next build` |
| `pnpm start` | Production server |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | `tsc --noEmit` |

## Connect MCP clients (Cursor, Inspector)

```json
{
  "mcpServers": {
    "google-maps": {
      "url": "http://localhost:3000/mcp"
    }
  }
}
```

```bash
pnpm dlx @modelcontextprotocol/inspector --transport http --server-url http://localhost:3000/mcp
```

## In-app chat

`POST /api/chat` loads tools from the same MCP server (`lib/mcp-chat-client.ts`, `MCP_CHAT_URL`). Tool results render in `components/maps-chat-panel.tsx` / `maps-tool-result.tsx`.

---

## VPS deployment (Podman + Cloudflare)

Production on `ubuntu@100.117.130.2` uses the shared **termux-stack** pod (port **3004**), quadlet [`deploy/google-map-test.container`](deploy/google-map-test.container), and tunnel hostname **`maps.uratmangun.ovh`**.

1. Copy [`.env.local`](.env.local) to `/home/ubuntu/apps/google-map-test/.env.local` — see [`deploy/env.production.example`](deploy/env.production.example) for URL overrides.
2. **Quota guard on production:** deploy a Monitoring Viewer service account key:

   ```bash
   # One-time (creates maps-quota-monitoring@coba-409011 + gcp/monitoring-sa.json)
   CREATE=1 bash deploy/setup-gcp-monitoring-sa.sh

   # Later deploys (copy existing key to VPS)
   bash deploy/setup-gcp-monitoring-sa.sh
   ssh ubuntu@100.117.130.2 'systemctl --user restart google-map-test.service'
   ```

   Local dev can still use `gcloud auth application-default login`; production uses `gcp/monitoring-sa.json` mounted read-only in the container.
3. Add `PublishPort=127.0.0.1:3004:3004` to `~/.config/containers/systemd/termux-stack.pod`.
4. Add ingress `maps.uratmangun.ovh` → `http://termux-stack:3004` in `termux-migration/apps/.cloudflared/config.remote.yml`.
5. `podman build -t localhost/google-map-test:latest .` then `systemctl --user daemon-reload && systemctl --user enable --now google-map-test.service`.
6. **SQLite auth DB writable** (rootless Podman): `bash deploy/fix-data-volume-permissions.sh` on the VPS.

Verify: `curl -sSf -o /dev/null -w '%{http_code}\n' https://maps.uratmangun.ovh/`

## Further reading

- [`docs/mcp-maps.md`](docs/mcp-maps.md) — MCP endpoint, Inspector, MCP Apps conformance
- [`docs/google-maps-api-key.md`](docs/google-maps-api-key.md) — `gcloud` login, OAuth for `/maps-usage`, troubleshooting
- [Google Maps Platform pricing](https://developers.google.com/maps/billing-and-pricing/pricing)
