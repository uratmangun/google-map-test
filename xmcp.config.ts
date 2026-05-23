import type { XmcpConfig } from "xmcp";

const config: XmcpConfig = {
  http: true,
  typescript: {
    skipTypeCheck: true,
  },
  experimental: {
    adapter: "nextjs",
  },
  paths: {
    tools: "src/tools",
    prompts: false,
    resources: false,
  },
};

export default config;
