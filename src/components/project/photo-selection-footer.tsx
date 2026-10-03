// photo-selection-footer.tsx
"use client";

import { useState } from "react";
import {
  IconX,
  IconShare2,
  IconDots,
  IconDownload,
  IconTrash,
  IconChevronRight,
} from "@tabler/icons-react";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "../ui/drawer";
import { cn } from "@/lib/utils";
import { Spinner } from "../ui/spinner";

type PhotoSelectionFooterProps = {
  selectedCount: number;
  onCancel: () => void;
  onShareClick: () => void;
  onDownload: () => Promise<void>;
  onDelete: () => Promise<void>;
};

function PhotoSelectionFooter({
  selectedCount,
  onCancel,
  onShareClick,
  onDownload,
  onDelete,
}: PhotoSelectionFooterProps) {
  const [moreDrawerOpen, setMoreDrawerOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const hasSelection = selectedCount > 0;
  const isBusy = isDownloading || isDeleting;

  async function handleDownload() {
    setIsDownloading(true);
    try {
      await onDownload();
      setMoreDrawerOpen(false);
    } finally {
      setIsDownloading(false);
    }
  }

  async function handleDelete() {
    setIsDeleting(true);
    try {
      await onDelete();
      setMoreDrawerOpen(false);
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <>
      <nav className="fixed bottom-8 left-4 right-4 z-50 max-w-xs mx-auto">
        <div className="flex items-center justify-around bg-card border border-border rounded-full px-6 py-3 shadow-sm">
          <button
            onClick={onCancel}
            className="flex flex-col items-center gap-1 min-w-16"
            aria-label="Cancel selection"
          >
            <div className="w-12 h-12 rounded-full bg-[#2F6FEB]/10 flex items-center justify-center">
              <IconX size={22} className="text-[#2563eb]" />
            </div>
          </button>

          <button
            onClick={onShareClick}
            disabled={!hasSelection}
            className="flex flex-col items-center gap-1 min-w-16"
            aria-label="Share selected photos"
          >
            <div
              className={cn(
                "w-14 h-14 rounded-full flex items-center justify-center",
                hasSelection ? "bg-[#2563eb]" : "bg-[#2563eb]",
              )}
            >
              <IconShare2
                size={22}
                className={hasSelection ? "text-card" : "text-card"}
              />
            </div>
          </button>

          <button
            onClick={() => setMoreDrawerOpen(true)}
            disabled={!hasSelection}
            className="flex flex-col items-center gap-1 min-w-16"
            aria-label="More options"
          >
            <div className="w-12 h-12 rounded-full bg-[#2F6FEB]/10 flex items-center justify-center">
              <IconDots
                size={22}
                className={hasSelection ? "text-foreground" : "text-[#2563eb]"}
              />
            </div>
          </button>
        </div>
      </nav>

      <Drawer open={moreDrawerOpen} onOpenChange={setMoreDrawerOpen}>
        <DrawerContent className="bg-background" aria-describedby={undefined}>
          <DrawerHeader className="flex-1 items-start">
            <DrawerTitle className="text-xl font-bold">
              Manage Photos
            </DrawerTitle>
            <DrawerDescription>
              {selectedCount} photo{selectedCount === 1 ? "" : "s"} selected
            </DrawerDescription>
          </DrawerHeader>
          <div className="flex flex-col gap-2 px-4 pb-6">
            <button
              disabled={isBusy}
              className="flex items-center justify-between gap-3 rounded-2xl px-3 py-3 text-left hover:bg-muted bg-white border border-border disabled:opacity-60"
              onClick={handleDownload}
            >
              <div className="flex flex-row items-center gap-4">
                <div className="h-12 w-12 bg-[#2F6FEB]/10 flex items-center justify-center rounded-lg text-[#2563eb]">
                  {isDownloading ? (
                    <Spinner className="size-5" />
                  ) : (
                    <IconDownload size={20} stroke={2} />
                  )}
                </div>
                <div className="flex flex-col">
                  <span className="font-semibold text-sm">
                    Download to Device
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Save the selected photos to your phone
                  </span>
                </div>
              </div>
              <div>
                <IconChevronRight size={16} stroke={1.5} className="text-brand-tertiary" />
              </div>
            </button>
            <button
              disabled={isBusy}
              className="flex items-center justify-between gap-3 rounded-2xl px-3 py-3 text-left hover:bg-muted bg-white border border-border disabled:opacity-60"
              onClick={handleDelete}
            >
              <div className="flex flex-row items-center gap-4">
                <div className="h-12 w-12 bg-[#2F6FEB]/10 flex items-center justify-center rounded-lg text-[#2563eb]">
                  {isDeleting ? (
                    <Spinner className="size-5" />
                  ) : (
                    <IconTrash size={20} stroke={2} />
                  )}
                </div>
                <div className="flex flex-col">
                  <span className="font-semibold text-sm">Delete</span>
                  <span className="text-xs text-muted-foreground">
                    Delete selected photos from the project
                  </span>
                </div>
              </div>
              <div>
                <IconChevronRight size={16} stroke={1.5} className="text-brand-tertiary" />
              </div>
            </button>
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}

export default PhotoSelectionFooter;
