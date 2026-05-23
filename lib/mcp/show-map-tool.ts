import { type ToolMetadata } from "xmcp";
import { z } from "zod";

export const schema = {
  latitude: z
    .number()
    .min(-90)
    .max(90)
    .describe("Latitude from search-place structuredContent.primary"),
  longitude: z
    .number()
    .min(-180)
    .max(180)
    .describe("Longitude from search-place structuredContent.primary"),
  zoom: z
    .number()
    .int()
    .min(1)
    .max(21)
    .optional()
    .describe("Map zoom level (default 15)"),
  maptype: z
    .enum(["roadmap", "satellite", "terrain", "hybrid"])
    .optional()
    .describe("Map style (default roadmap)"),
};

export const outputSchema = {
  center: z.object({
    latitude: z.number(),
    longitude: z.number(),
  }),
  zoom: z.number(),
  maptype: z.string(),
  mimeType: z.string(),
  size: z.object({
    width: z.number(),
    height: z.number(),
  }),
  imageBase64: z.string(),
  embedUrl: z.string().url(),
  mapsUrl: z.string(),
};

export const metadata: ToolMetadata = {
  name: "show-map-at-coordinates",
  description:
    "Render an embedded Google Map for latitude/longitude. Shows an interactive map widget in ChatGPT and MCP App hosts.",
  annotations: {
    title: "Show map at coordinates",
    readOnlyHint: true,
    openWorldHint: true,
  },
  _meta: {
    openai: {
      widgetAccessible: true,
      resultCanProduceWidget: true,
      toolInvocation: {
        invoking: "Loading map",
        invoked: "Map ready",
      },
      widgetCSP: {
        connect_domains: [
          "http://localhost:3000",
          "http://127.0.0.1:3000",
        ],
        resource_domains: [
          "http://localhost:3000",
          "http://127.0.0.1:3000",
          "https://www.google.com",
          "https://maps.google.com",
        ],
        redirect_domains: [
          "https://www.google.com",
          "https://maps.google.com",
        ],
      },
    },
  },
};
