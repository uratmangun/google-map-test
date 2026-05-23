# Design files

## Homepage (`homepage.pen`)

Light-theme mock for `/` — **Maps assistant** chat with tool calling. **Not implemented yet**.

| Area | Design |
|------|--------|
| Theme | Google Maps: directions, places, parks, food, nearby search |
| Background | Same as maps-usage (`#f4f7fb`) |
| Top hero card | **Removed** |
| Header | **M** logo · Maps assistant · Usage dashboard link |
| Sidebar | **+ New chat** → **Search chats…** (FTS/BM25 later) → RECENT list |
| Main chat | Maps tools badge · map prompts · “Ask for a place, directions…” |
| Sample threads | Parks near Bandung, ramen Jakarta, directions airport, coffee shops |

Export PNG: Pencil MCP `export_nodes` on frame `U6EaE`.

## Maps quota dashboard designs

Light-theme mock for `/maps-usage`.

| File | Description |
|------|-------------|
| `quota.pen` | Pencil source (edit in Pencil / MCP) |
| `quota.png` | Exported mockup (@2x) |
| `bQGJa.png` | Same export (root frame id) |

Implemented in `components/maps-quota-dashboard.tsx` (see comment in file).

## Regenerate PNG

```bash
# CLI (needs working Claude API)
pencil --out designs/quota.pen --prompt "..." --export designs/quota.png --export-scale 2

# Or Pencil MCP: open designs/quota.pen → batch_design → export_nodes
```

## Design tokens

- Page background: `#f4f7fb`
- Cards: `#ffffff`, 16px radius
- Primary: `#1a73e8`
- Disclaimer: `#fffbeb` / `#92400e`
- Progress track: `#f1f5f9`; fill green `#22c55e`, amber `#f59e0b` at 50%+
