import { type ToolMetadata } from "xmcp";
import { z } from "zod";

export const schema = {
  originLatitude: z
    .number()
    .min(-90)
    .max(90)
    .describe("Origin latitude (point A)"),
  originLongitude: z
    .number()
    .min(-180)
    .max(180)
    .describe("Origin longitude (point A)"),
  destinationLatitude: z
    .number()
    .min(-90)
    .max(90)
    .describe("Destination latitude (point B)"),
  destinationLongitude: z
    .number()
    .min(-180)
    .max(180)
    .describe("Destination longitude (point B)"),
  mode: z
    .enum(["driving", "walking", "bicycling", "transit"])
    .optional()
    .describe("Travel mode for the route preview (default driving)"),
};

export const outputSchema = {
  mapUrl: z.string().url(),
};

export const metadata: ToolMetadata = {
  name: "show-directions",
  description:
    "Render an embedded Google Map directions preview from point A to point B. Returns mapUrl in TOON; MCP Apps hosts show an interactive iframe widget.",
  annotations: {
    title: "Show directions",
    readOnlyHint: true,
    openWorldHint: true,
  },
  _meta: {
    openai: {
      widgetAccessible: true,
      resultCanProduceWidget: true,
      toolInvocation: {
        invoking: "Loading directions",
        invoked: "Directions ready",
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
