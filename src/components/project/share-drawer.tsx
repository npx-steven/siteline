"use client";

import {
  IconLayoutGrid,
  IconTimeline,
  IconChevronRight,
} from "@tabler/icons-react";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "../ui/drawer";

type ShareDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTypeSelect: (type: "gallery" | "timeline") => void;
};

function ShareDrawer({ open, onOpenChange, onTypeSelect }: ShareDrawerProps) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="bg-background" aria-describedby={undefined}>
        <DrawerHeader className="flex-1 items-start">
          <DrawerTitle className="text-xl font-bold">Share Photos</DrawerTitle>
          <DrawerDescription>
            Pick a layout for the client&apos;s view
          </DrawerDescription>
        </DrawerHeader>
        <div className="flex flex-col gap-2 px-4 pb-6">
          <button
            className="flex items-center justify-between gap-3 rounded-2xl px-3 py-3 text-left hover:bg-muted bg-white border border-border"
            onClick={() => onTypeSelect("gallery")}
          >
            {" "}
            <div className="flex flex-row items-center gap-4">
              <div className="h-12 w-12 bg-[#2F6FEB]/10 flex items-center justify-center rounded-lg text-[#2563eb]">
                <IconLayoutGrid size={20} stroke={2} />
              </div>
              <div className="flex flex-col">
                <span className="font-semibold text-sm">Photo gallery</span>
                <span className="text-xs text-muted-foreground">
                  A clean grid of the selected photos
                </span>
              </div>
            </div>
            <div>
              <IconChevronRight size={16} stroke={1.5} className="text-brand-tertiary" />
            </div>
          </button>
          <button
            className="flex items-center justify-between gap-3 rounded-2xl px-3 py-3 text-left hover:bg-muted bg-white border border-border"
            onClick={() => onTypeSelect("timeline")}
          >
            {" "}
            <div className="flex flex-row items-center gap-4">
              <div className="h-12 w-12 bg-[#2F6FEB]/10 flex items-center justify-center rounded-lg text-[#2563eb]">
                <IconTimeline size={20} stroke={2} />
              </div>
              <div className="flex flex-col">
                <span className="font-semibold text-sm">Project Timeline</span>
                <span className="text-xs text-muted-foreground">
                  Photos in date order, grouped by day
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
  );
}

export default ShareDrawer;
