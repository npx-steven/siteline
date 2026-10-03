"use client";

import { formatDayAndTime } from "@/lib/helpers";
import { cn } from "@/lib/utils";
import { IconInfoCircle, IconX } from "@tabler/icons-react";

type PhotoViewerTopBarProps = {
  position: number;
  total: number;
  takenAt: string;
  panelOpen: boolean;
  panelId: string;
  onClose: () => void;
  onTogglePanel: () => void;
};

function PhotoViewerTopBar({
  position,
  total,
  takenAt,
  panelOpen,
  panelId,
  onClose,
  onTogglePanel,
}: PhotoViewerTopBarProps) {
  return (
    <header className="relative z-10 flex shrink-0 items-center justify-between gap-3 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
      <button
        type="button"
        onClick={onClose}
        aria-label="Close photo"
        className="flex size-11 shrink-0 items-center justify-center rounded-full bg-white/15 text-white transition-colors active:bg-white/25 [@media(hover:hover)]:hover:bg-white/25"
      >
        <IconX size={22} stroke={2} />
      </button>

      <div className="min-w-0 text-center" aria-live="polite">
        <p className="text-base font-semibold leading-tight tabular-nums">
          {position} of {total}
        </p>
        <p className="mt-0.5 truncate text-[13px] leading-tight text-white/60">
          {formatDayAndTime(new Date(takenAt))}
        </p>
      </div>

      <button
        type="button"
        onClick={onTogglePanel}
        aria-label={panelOpen ? "Hide photo info" : "Show photo info"}
        aria-expanded={panelOpen}
        aria-controls={panelId}
        className={cn(
          "flex size-11 shrink-0 items-center justify-center rounded-full transition-colors",
          panelOpen
            ? "bg-white text-[#1c1c1e]"
            : "bg-white/15 text-white active:bg-white/25 [@media(hover:hover)]:hover:bg-white/25",
        )}
      >
        <IconInfoCircle size={22} stroke={2} />
      </button>
    </header>
  );
}

export default PhotoViewerTopBar;
