"use client";

import {
  formatDate,
  formatDayAndTime,
  groupPhotosByDate,
  photoTakenAt,
  userInitials,
} from "@/lib/helpers";
import { cn } from "@/lib/utils";
import { ViewerPhoto } from "@/types/db";
import { IconCheck } from "@tabler/icons-react";
import Image from "next/image";

type PhotoGridProps = {
  photos: ViewerPhoto[] | null;
  selectionMode: boolean;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onOpen: (id: string) => void;
};

function PhotoGrid({
  photos,
  selectionMode,
  selectedIds,
  onToggleSelect,
  onOpen,
}: PhotoGridProps) {
  const groups = groupPhotosByDate(photos ?? []);

  return (
    <div className="">
      {Object.entries(groups).map(([label, groupPhotos]) => {
        const dateLabel = formatDate(new Date(photoTakenAt(groupPhotos[0])));
        const showDateLabel = label === "Today" || label === "Yesterday";
        return (
          <div key={label}>
            {/* header */}
            <h2 className="text-sm text-muted-foreground my-2 font-normal">
              {label}
              {showDateLabel && ` · ${dateLabel}`}
            </h2>
            {/* grid */}
            <div className="grid grid-cols-4 gap-2">
              {groupPhotos.map((photo) => {
                const isSelected = selectedIds.has(photo.id);
                return (
                  <button
                    type="button"
                    key={photo.id}
                    onClick={() =>
                      selectionMode ? onToggleSelect(photo.id) : onOpen(photo.id)
                    }
                    aria-label={
                      selectionMode
                        ? `${isSelected ? "Deselect" : "Select"} photo from ${formatDayAndTime(new Date(photoTakenAt(photo)))}`
                        : `Open photo from ${formatDayAndTime(new Date(photoTakenAt(photo)))}`
                    }
                    aria-pressed={selectionMode ? isSelected : undefined}
                    className={cn(
                      "relative aspect-square rounded-md overflow-hidden cursor-pointer",
                      isSelected && "ring-2 ring-blue-600",
                    )}
                  >
                    <Image
                      src={photo.url}
                      alt={`Photo uploaded by ${photo.uploaded_by_name ?? "unknown"}`}
                      fill
                      sizes="25vw"
                      className="object-cover"
                    />
                    <div className="absolute bottom-2 left-2 flex items-center justify-center size-6 rounded-full bg-white text-foreground text-xs font-normal shadow-sm">
                      {userInitials(photo.uploaded_by_name)}
                    </div>
                    {selectionMode && (
                      <div
                        className={cn(
                          "absolute top-2 right-2 flex items-center justify-center size-5 rounded-full border-2",
                          isSelected
                            ? "bg-blue-600 border-blue-600"
                            : "bg-white/80 border-white",
                        )}
                      >
                        {isSelected && (
                          <IconCheck
                            size={14}
                            stroke={3}
                            className="text-white"
                          />
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default PhotoGrid;
