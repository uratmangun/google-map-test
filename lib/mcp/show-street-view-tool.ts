import { type ToolMetadata } from "xmcp";
import { z } from "zod";

export const schema = {
  latitude: z
    .number()
    .min(-90)
    .max(90)
    .describe("Latitude for Street View (from search-place or get-place-detail)"),
  longitude: z
    .number()
    .min(-180)
    .max(180)
    .describe("Longitude for Street View"),
  heading: z
    .number()
    .min(0)
    .max(360)
    .optional()
    .describe("Camera compass heading in degrees (0–360)"),
  pitch: z
    .number()
    .min(-90)
    .max(90)
    .optional()
    .describe("Camera pitch in degrees (-90 to 90, default 0)"),
  fov: z
    .number()
    .min(10)
    .max(100)
    .optional()
    .describe("Horizontal field of view in degrees (10–100, default 90)"),
};

export const outputSchema = {
  mapUrl: z.string().url(),
};

export const metadata: ToolMetadata = {
  name: "show-street-view",
  description:
    "Render an embedded Google Street View panorama at latitude/longitude. Returns mapUrl in TOON; MCP Apps hosts show an interactive iframe widget.",
  annotations: {
    title: "Show Street View",
    readOnlyHint: true,
    openWorldHint: true,
  },
  _meta: {
    openai: {
      widgetAccessible: true,
      resultCanProduceWidget: true,
      toolInvocation: {
        invoking: "Loading Street View",
        invoked: "Street View ready",
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
