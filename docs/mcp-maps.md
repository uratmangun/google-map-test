# Google Maps MCP (Next.js + xmcp)

HTTP MCP endpoint: **`http://localhost:3000/mcp`** (same origin as the Next.js app).

Uses [xmcp](https://xmcp.dev/) with the [Next.js adapter](https://github.com/basementstudio/xmcp/tree/main/examples/with-nextjs). Tools live in `src/tools/`; `xmcp build` generates `.xmcp/tools.js`. The route in `lib/mcp/xmcp-http.ts` serves Streamable HTTP using xmcp’s tool registry (works with Turbopack; `@xmcp/adapter` CJS export is optional via `scripts/patch-xmcp-adapter.mjs`).

## Tools

| Tool | Purpose | Output |
|------|---------|--------|
| `search-place` | Find places (default **3**/page, relevance order; rating, website, phone, Maps URL) | **JSON** (`results`, `nextPageToken`, `hasMore`) |
| `show-map-at-coordinates` | Embedded Google Map for lat/lng (ChatGPT Apps widget) | **structuredContent** + inline widget in ChatGPT |

Typical flow: `search-place` → read `primary.latitude` / `primary.longitude` → `show-map-at-coordinates`.

## Setup

1. Enable **Places API (New)** on your GCP project.
2. Set `GOOGLE_MAPS_API_KEY` in `.env.local` (server-side; never commit).
3. Run the app:

```fish
pnpm install
pnpm dev
```

`pnpm dev` runs `xmcp dev` (watches tools) and `next dev` together. For production, `pnpm build` runs `xmcp build` before `next build`.

## Connect in Cursor

```json
{
  "mcpServers": {
    "google-maps": {
      "url": "http://localhost:3000/mcp"
    }
  }
}
```

Restart Cursor after changing MCP config.

## Test with MCP Inspector

With `pnpm dev` running, open the [MCP Inspector](https://modelcontextprotocol.io/docs/tools/inspector):

```fish
pnpm dlx @modelcontextprotocol/inspector --transport http --server-url http://localhost:3000/mcp
```

In the UI: connect with **HTTP**, URL `http://localhost:3000/mcp`, then use **Tools** → `search-place` (e.g. query `Eiffel Tower Paris`).

CLI smoke test:

```fish
node scripts/test-mcp.mjs
```

## Adding tools

1. Add `src/tools/your-tool.ts` with `schema`, `metadata`, and a `default` async handler.
2. Restart dev or run `xmcp build` so `.xmcp/adapter` is regenerated.

## In-app chat (`/api/chat`)

The Maps assistant chat connects to the same MCP server via [`@ai-sdk/mcp`](https://ai-sdk.dev/docs/ai-sdk-core/mcp-tools) (`MCP_CHAT_URL`, default `http://127.0.0.1:3000/mcp`). The model can run multiple tool steps (`search-place` → `show-map-at-coordinates`) with ai-elements `Tool` UI in the chat panel.

## MCP Apps + ChatGPT (`show-map-at-coordinates`)

The map tool advertises UI metadata (`_meta.ui.resourceUri`, `openai/outputTemplate`) and serves a `ui://` HTML resource. Verify with:

```fish
pnpm dlx @mcpjam/cli apps conformance --url http://localhost:3000/mcp
```

- Widget bundle: `dist/client/*.bundle.js` (served at `/mcp-widgets/...`)
- Tool result: `structuredContent` with `embedUrl`, `imageBase64`, and map metadata; `content` includes full JSON text + image
- Widget: `src/tools/show-map-at-coordinates.tsx` (same pattern as [xmcp counter example](https://github.com/basementstudio/xmcp/blob/main/examples/mcp-app-react/src/tools/counter.tsx))

Set `NEXT_PUBLIC_GPT_APP_ORIGIN` to your public HTTPS URL when using ChatGPT (widget script + CSP).

## Notes

- Usage bills against your Google Maps Platform quotas.
