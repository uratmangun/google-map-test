"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckIcon, CopyIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getPublicMcpUrl } from "@/lib/public-mcp-url";
import { cn } from "@/lib/utils";

export function MapsMcpEndpointCopy({ className }: { className?: string }) {
  const [mcpUrl, setMcpUrl] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setMcpUrl(getPublicMcpUrl(window.location.origin));
  }, []);

  const copyMcpUrl = useCallback(async () => {
    if (!mcpUrl) return;
    try {
      await navigator.clipboard.writeText(mcpUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard may be unavailable outside a secure context.
    }
  }, [mcpUrl]);

  return (
    <div
      className={cn(
        "w-full max-w-md rounded-2xl border border-[#e2e8f0] bg-white px-5 py-4 text-left shadow-[0_1px_2px_rgba(15,23,42,0.04),0_4px_12px_rgba(15,23,42,0.03)]",
        className,
      )}
    >
      <div className="mb-3 space-y-1">
        <p className="text-[13px] font-semibold text-[#0f172a]">MCP server URL</p>
        <p className="text-[12px] text-[#64748b]">
          Copy this endpoint into Cursor, ChatGPT, or any MCP client.
        </p>
      </div>
      <div className="flex gap-2">
        <Input
          readOnly
          value={mcpUrl}
          aria-label="MCP server URL"
          className="h-9 flex-1 rounded-lg border-[#e2e8f0] bg-[#f8fafc] font-mono text-[12px] text-[#334155] selection:bg-[#e8f0fe]"
          onFocus={(event) => event.currentTarget.select()}
        />
        <Button
          type="button"
          variant="outline"
          onClick={() => void copyMcpUrl()}
          disabled={!mcpUrl}
          className="h-9 shrink-0 gap-1.5 rounded-lg border-[#e2e8f0] bg-white px-3 text-[12px] font-medium text-[#334155] hover:bg-[#f8fafc]"
        >
          {copied ? (
            <CheckIcon className="size-3.5 text-[#15803d]" aria-hidden />
          ) : (
            <CopyIcon className="size-3.5" aria-hidden />
          )}
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
    </div>
  );
}
