"use client";

import { Document, ViewerPhoto } from "@/types/db";
import { useState } from "react";
import { useRouter } from "next/navigation";

import { cn } from "@/lib/utils";
import EmptyState from "@/components/project/empty-state";
import {
  IconCamera,
  IconFileText,
  IconSquareCheck,
  IconPlus,
  IconUpload,
} from "@tabler/icons-react";
import { Button } from "../ui/button";
import AddMediaDrawer from "./add-media-drawer";
import PhotoGrid from "./photo-grid";
import DocumentList from "./document-list";
import PhotoSelectionFooter from "./photo-selection-footer";
import DocumentSelectionFooter from "./document-selection-footer";
import {
  deleteMediaAction,
  getMediaDownloadsAction,
} from "@/actions/media";
import { downloadFilesToDevice } from "@/lib/helpers";
import { toast } from "sonner";

type ProjectTabsProps = {
  projectId: string;
  photos: ViewerPhoto[] | null;
  documents: Document[] | null;
  selectionMode: boolean;
  selectedIds: Set<string>;
  onEnterSelection: () => void;
  onExitSelection: () => void;
  onToggleSelect: (id: string) => void;
  onSelectAll: (ids: string[]) => void;
  onShareClick: () => void;
  onOpenPhoto: (id: string) => void;
};

function ProjectTabs({
  photos,
  documents,
  projectId,
  selectionMode,
  selectedIds,
  onEnterSelection,
  onExitSelection,
  onToggleSelect,
  onSelectAll,
  onShareClick,
  onOpenPhoto,
}: ProjectTabsProps) {
  const [activeTab, setActiveTab] = useState<"photos" | "documents">("photos");
  const [addDrawerOpen, setAddDrawerOpen] = useState(false);
  const router = useRouter();

  const activeItems = activeTab === "photos" ? photos : documents;
  const activeBucket = activeTab === "photos" ? "photos" : "documents";

  const handleDownloadSelected = async () => {
    if (selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    const result = await getMediaDownloadsAction(activeBucket, ids, projectId);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    try {
      await downloadFilesToDevice(result.files);
      toast.success(
        `Downloaded ${result.files.length} ${activeBucket === "photos" ? "photo" : "document"}${result.files.length === 1 ? "" : "s"}`,
      );
    } catch {
      toast.error("Some files failed to download");
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    const count = ids.length;
    const result = await deleteMediaAction(activeBucket, ids, projectId);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    onExitSelection();
    router.refresh();
    toast.success(
      `Deleted ${count} ${activeBucket === "photos" ? "photo" : "document"}${count === 1 ? "" : "s"}`,
    );
  };

  // Holding a photo starts selection mode with it selected. Already selecting,
  // a hold acts like a tap — the long press swallows the release's click, so
  // it has to toggle here or it would do nothing.
  const handlePhotoLongPress = (id: string) => {
    if (!selectionMode) onEnterSelection();
    onToggleSelect(id);
  };

  const allSelected =
    (activeItems?.length ?? 0) > 0 &&
    activeItems!.every((item) => selectedIds.has(item.id));

  const handleSelectAllToggle = () => {
    if (allSelected) {
      onSelectAll([]);
    } else {
      onSelectAll((activeItems ?? []).map((item) => item.id));
    }
  };

  const countBar = selectionMode ? (
    <div className="flex flex-row items-center justify-between h-10">
      <span className="text-foreground font-semibold text-sm">
        {selectedIds.size} Selected
      </span>
      <button
        className="text-sm font-medium text-blue-600"
        onClick={handleSelectAllToggle}
      >
        {allSelected ? "Deselect all" : "Select all"}
      </button>
    </div>
  ) : (
    <div className="flex flex-row items-center justify-between h-10">
      <span className="text-foreground font-semibold text-sm">
        {activeTab === "photos"
          ? `Photos · ${photos?.length ?? 0}`
          : `Documents · ${documents?.length ?? 0}`}
      </span>
      <div className="flex flex-row gap-2">
        <Button
          size="icon"
          className="rounded-full bg-neutral-200 hover:bg-neutral-300 text-foreground"
          onClick={onEnterSelection}
        >
          <IconSquareCheck />
        </Button>
        <Button
          size="icon"
          className="rounded-full "
          onClick={() => setAddDrawerOpen(true)}
        >
          <IconPlus />
        </Button>
      </div>
    </div>
  );

  return (
    <div>
      {/*Tab Controls */}
      <div className="px-4 mt-6">
        <div className="flex w-full rounded-full bg-neutral-200 py-0.5 overflow-visible">
          <button
            disabled={selectionMode}
            onClick={() => setActiveTab("photos")}
            className={cn(
              "flex-1 rounded-full py-1.5 text-sm font-medium transition-all ",
              activeTab === "photos"
                ? "bg-foreground text-background shadow-xl"
                : "text-muted-foreground",
              selectionMode && "opacity-50",
            )}
          >
            Photos
          </button>
          <button
            disabled={selectionMode}
            onClick={() => setActiveTab("documents")}
            className={cn(
              "flex-1 rounded-full py-1.5 text-sm font-medium transition-all ",
              activeTab === "documents"
                ? "bg-foreground text-background shadow-xl"
                : "text-muted-foreground",
              selectionMode && "opacity-50",
            )}
          >
            Documents
          </button>
        </div>
      </div>
      {/*Count Bar + Multi Select & Add Button */}
      <div className="w-full py-4 rounded-b-lg px-4">{countBar}</div>
      {/*Photo Grid and Document List w/ Empty State */}
      <div className="px-4 pb-32">
        {activeTab === "photos" ? (
          photos && photos.length > 0 ? (
            <PhotoGrid
              photos={photos}
              selectionMode={selectionMode}
              selectedIds={selectedIds}
              onToggleSelect={onToggleSelect}
              onOpen={onOpenPhoto}
              onLongPress={handlePhotoLongPress}
            />
          ) : (
            <div className="flex flex-col items-center justify-center">
              <EmptyState
                icon={IconCamera}
                title="No Photos Yet"
                subtext="Tap the camera to log progress. Each photo auto-files to this project."
              />
              <Button
                variant="default"
                size="lg"
                className="font-semibold px-4 py-5 rounded-full"
                onClick={() => setAddDrawerOpen(true)}
              >
                <IconPlus />
                Add Photo
              </Button>
            </div>
          )
        ) : documents && documents.length > 0 ? (
          <div className="mt-4">
            <DocumentList
              documents={documents}
              selectionMode={selectionMode}
              selectedIds={selectedIds}
              onToggleSelect={onToggleSelect}
            />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center">
            <EmptyState
              icon={IconFileText}
              title="No Documents Yet"
              subtext="Store permits, plans, and contracts for this project."
            />
            <Button
              variant="default"
              size="lg"
              className="font-semibold px-4 py-5 rounded-full"
              onClick={() => setAddDrawerOpen(true)}
            >
              <IconUpload />
              Upload Document
            </Button>
          </div>
        )}
      </div>
      {selectionMode &&
        (activeTab === "photos" ? (
          <PhotoSelectionFooter
            selectedCount={selectedIds.size}
            onCancel={onExitSelection}
            onShareClick={onShareClick}
            onDownload={handleDownloadSelected}
            onDelete={handleDeleteSelected}
          />
        ) : (
          <DocumentSelectionFooter
            selectedCount={selectedIds.size}
            onCancel={onExitSelection}
            onDownload={handleDownloadSelected}
            onDelete={handleDeleteSelected}
          />
        ))}
      <AddMediaDrawer
        projectId={projectId}
        activeTab={activeTab}
        open={addDrawerOpen}
        onOpenChange={setAddDrawerOpen}
      />
    </div>
  );
}

export default ProjectTabs;
