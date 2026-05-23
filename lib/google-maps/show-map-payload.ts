import { buildEmbedViewUrl } from "@/lib/google-maps/embed-map";
import { fetchStaticMapImage } from "@/lib/google-maps/static-map";

export type MapToolPayload = {
  center: { latitude: number; longitude: number };
  zoom: number;
  maptype: string;
  mimeType: string;
  size: { width: number; height: number };
  imageBase64: string;
  embedUrl: string;
  mapsUrl: string;
};

export type ShowMapInput = {
  latitude: number;
  longitude: number;
  zoom?: number;
  maptype?: "roadmap" | "satellite" | "terrain" | "hybrid";
};

function googleMapsUrl(latitude: number, longitude: number): string {
  return `https://www.google.com/maps?q=${latitude},${longitude}`;
}

export async function buildShowMapPayload(
  input: ShowMapInput,
): Promise<MapToolPayload> {
  const image = await fetchStaticMapImage(input);
  const center = image.center;

  return {
    center,
    zoom: image.zoom,
    maptype: image.maptype,
    mimeType: image.mimeType,
    size: image.size,
    imageBase64: image.data,
    embedUrl: buildEmbedViewUrl(input),
    mapsUrl: googleMapsUrl(center.latitude, center.longitude),
  };
}

export async function buildShowMapToolResult(input: ShowMapInput) {
  const map = await buildShowMapPayload(input);
  // MCP Apps hosts pass tool-result props from structuredContent.args first;
  // ChatGPT may read flat structuredContent via useToolOutput.
  const structuredContent = {
    ...map,
    args: { ...input, ...map },
  };
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(structuredContent, null, 2),
      },
      {
        type: "image" as const,
        data: map.imageBase64,
        mimeType: map.mimeType,
      },
    ],
    structuredContent,
  };
}
