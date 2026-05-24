"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckIcon, CopyIcon, ExternalLinkIcon, XIcon } from "lucide-react";
import { defaultTranslations, type LinkSafetyModalProps } from "streamdown";

import { cn } from "@/lib/utils";

export function MapsLinkSafetyModal({
  isOpen,
  onClose,
  onConfirm,
  url,
}: LinkSafetyModalProps) {
  const t = defaultTranslations;
  const [copied, setCopied] = useState(false);

  const copyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard may be unavailable outside a secure context.
    }
  }, [url]);

  useEffect(() => {
    if (!isOpen) setCopied(false);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#0f172a]/25 backdrop-blur-[2px]"
      data-streamdown="link-safety-modal"
      role="button"
      tabIndex={0}
      onClick={onClose}
      onKeyDown={(event) => {
        if (event.key === "Escape") onClose();
      }}
    >
      <div
        className="relative mx-4 flex w-full max-w-md flex-col gap-4 rounded-2xl border border-[#e2e8f0] bg-white p-6 shadow-[0_8px_30px_rgba(15,23,42,0.1)]"
        role="presentation"
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          title={t.close}
          onClick={onClose}
          className="absolute top-4 right-4 rounded-lg p-1.5 text-[#64748b] transition hover:bg-[#f1f5f9] hover:text-[#0f172a]"
        >
          <XIcon className="size-4" aria-hidden />
        </button>

        <div className="flex flex-col gap-2 pr-8">
          <div className="flex items-center gap-2 text-lg font-semibold text-[#0f172a]">
            <ExternalLinkIcon className="size-5 text-[#1a73e8]" aria-hidden />
            <span>{t.openExternalLink}</span>
          </div>
          <p className="text-sm text-[#64748b]">{t.externalLinkWarning}</p>
        </div>

        <div
          className={cn(
            "break-all rounded-lg border border-[#e2e8f0] bg-[#f8fafc] p-3 font-mono text-xs text-[#334155]",
            url.length > 100 && "max-h-32 overflow-y-auto",
          )}
        >
          {url}
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void copyLink()}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-[#e2e8f0] bg-white px-3 py-2.5 text-sm font-medium text-[#334155] transition hover:bg-[#f8fafc]"
          >
            {copied ? (
              <CheckIcon className="size-4 text-[#15803d]" aria-hidden />
            ) : (
              <CopyIcon className="size-4" aria-hidden />
            )}
            {copied ? t.copied : t.copyLink}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#1a73e8] px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1557b0]"
          >
            <ExternalLinkIcon className="size-4" aria-hidden />
            {t.openLink}
          </button>
        </div>
      </div>
    </div>
  );
}
