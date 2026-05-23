import type { DynamicToolUIPart, ToolUIPart, UIMessage } from "ai";

export type MapsToolPart = Extract<
  UIMessage["parts"][number],
  { type: `tool-${string}` } | { type: "dynamic-tool" }
>;

export function isToolPart(
  part: UIMessage["parts"][number],
): part is MapsToolPart {
  return (
    (typeof part.type === "string" && part.type.startsWith("tool-")) ||
    part.type === "dynamic-tool"
  );
}

export function getToolName(part: MapsToolPart): string {
  return part.type === "dynamic-tool" ? part.toolName : part.type.slice(5);
}

const TOOL_TITLES: Record<string, string> = {
  "search-place": "Search place",
  "get-place-detail": "Place details",
  "show-map-at-coordinates": "Show map at coordinates",
  "show-directions": "Show directions",
  "show-street-view": "Show Street View",
};

export function formatToolTitle(part: MapsToolPart): string {
  const toolName = getToolName(part);
  return TOOL_TITLES[toolName] ?? toolName.replace(/-/g, " ");
}
