import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const url = process.env.MCP_URL ?? "http://localhost:3000/mcp";

const transport = new StreamableHTTPClientTransport(new URL(url));
const client = new Client(
  { name: "mcp-test-script", version: "1.0.0" },
  { capabilities: {} },
);

try {
  await client.connect(transport);
  console.log("connected");

  const { tools } = await client.listTools();
  console.log(
    "tools:",
    tools.map((t) => ({ name: t.name, description: t.description?.slice(0, 80) })),
  );

  const result = await client.callTool({
    name: "search-place",
    arguments: { query: "Eiffel Tower Paris" },
  });

  if (result.isError) {
    const text = result.content?.find((c) => c.type === "text")?.text;
    console.log("callTool error (check GOOGLE_MAPS_API_KEY):", text?.slice(0, 200));
    process.exit(1);
  }

  if (result.structuredContent?.place) {
    console.log("structuredContent.place:", result.structuredContent.place.name);
  } else {
    const text = result.content?.find((c) => c.type === "text")?.text ?? "";
    console.log("text preview:", text.slice(0, 120));
  }

  console.log("ok");
} catch (err) {
  console.error("MCP test failed:", err);
  process.exit(1);
} finally {
  await client.close();
}
