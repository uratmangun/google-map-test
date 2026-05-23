"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function MapsMessageDeleteDialog({
  open,
  onOpenChange,
  title,
  description,
  preview,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  preview: string;
  onConfirm: () => void;
}) {
  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="sm:max-w-md" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle className="text-[#0f172a]">{title}</DialogTitle>
          <DialogDescription className="text-[#64748b]">
            {description}
          </DialogDescription>
        </DialogHeader>

        <blockquote className="rounded-lg border border-[#e2e8f0] bg-[#f8fafc] px-3 py-2 text-[13px] leading-relaxed text-[#334155]">
          {preview}
        </blockquote>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            type="button"
            variant="outline"
            className="rounded-lg border-[#e2e8f0] bg-white text-[#334155] hover:bg-[#f8fafc]"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="rounded-lg bg-red-600 text-white hover:bg-red-700 hover:text-white"
            onClick={onConfirm}
          >
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
