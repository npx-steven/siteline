"use client";

import {
  formatDate,
  formatFileSize,
  groupDocumentsByDate,
} from "@/lib/helpers";
import { cn } from "@/lib/utils";

import { Document } from "@/types/db";
import { IconCheck, IconFileText } from "@tabler/icons-react";
import React from "react";

type DocumentListProps = {
  documents: Document[] | null;
  selectionMode: boolean;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
};

function DocumentList({
  documents,
  selectionMode,
  selectedIds,
  onToggleSelect,
}: DocumentListProps) {
  const groups = groupDocumentsByDate(documents ?? []);

  return (
    <div className="bg-card border border-border rounded-2xl px-3 py-2">
      {Object.entries(groups).map(([label, groupDocuments]) => {
        const dateLabel = formatDate(new Date(groupDocuments[0].uploaded_at));
        const showDateLabel = label === "Today" || label === "Yesterday";
        return (
          <div key={label} className="flex flex-col gap-4">
            {groupDocuments.map((document) => {
              const documentSize = formatFileSize(document.size_bytes);
              const isSelected = selectedIds.has(document.id);
              return (
                <div
                  key={document.id}
                  onClick={
                    selectionMode
                      ? () => onToggleSelect(document.id)
                      : undefined
                  }
                  className={cn(
                    "grid gap-3 items-center text-foreground py-2 rounded-lg px-2 -mx-2",
                    selectionMode
                      ? "grid-cols-[auto_1fr_auto_auto] cursor-pointer"
                      : "grid-cols-[auto_1fr_auto]",
                    isSelected && "bg-blue-50 ring-1 ring-blue-600",
                  )}
                >
                  <div className="flex w-10 h-10 bg-muted rounded-md items-center justify-center shrink-0">
                    <IconFileText size={24} stroke={1.5} />
                  </div>
                  <div className="flex flex-col justify-center min-w-0">
                    <h2 className="text-base font-semibold truncate">
                      {document.name}
                    </h2>
                    <span className="text-sm text-muted-foreground">
                      Uploaded {label} {showDateLabel && ` · ${dateLabel}`}
                    </span>
                  </div>
                  <div className="flex flex-row items-center justify-center">
                    <span className="text-sm text-muted-foreground shrink-0">
                      {documentSize}
                    </span>
                  </div>
                  {selectionMode && (
                    <div
                      className={cn(
                        "flex items-center justify-center size-5 rounded-full border-2 shrink-0",
                        isSelected
                          ? "bg-blue-600 border-blue-600"
                          : "bg-white border-neutral-300",
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
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

export default DocumentList;
