"use client";

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { ViewerPhoto, Document } from "@/types/db";
import { Coordinates } from "@/types/location";
import ProjectHero from "@/components/project/project-hero";
import ProjectTabs from "@/components/project/project-tabs";
import { useNavVisibility } from "@/lib/nav-visibility-context";
import ShareDrawer from "./share-drawer";
import { generateShareLink } from "@/actions/share";
import { toast } from "sonner";
import PhotoViewer from "@/components/photo-viewer/photo-viewer";
import { usePhotoParam } from "@/components/photo-viewer/use-photo-param";
import { orderPhotosForViewer } from "@/lib/photos";
import { updatePhotoNoteAction } from "@/actions/media";

type ProjectShellProps = {
  projectId: string;
  projectName: string;
  projectAddress: string;
  siteLocation: Coordinates | null;
  coverPhotoUrl: string | null;
  photos: ViewerPhoto[] | null;
  documents: Document[] | null;
  canShare: boolean;
};

function ProjectShell({
  projectId,
  projectName,
  projectAddress,
  siteLocation,
  coverPhotoUrl,
  photos,
  documents,
  canShare,
}: ProjectShellProps) {
  const router = useRouter();
  const photoViewer = usePhotoParam();
  const viewerPhotos = useMemo(
    () => orderPhotosForViewer(photos ?? []),
    [photos],
  );

  const handleSaveNote = useCallback(
    async (photoId: string, note: string) => {
      const { error } = await updatePhotoNoteAction(projectId, photoId, note);
      if (!error) router.refresh();
      return error;
    },
    [projectId, router],
  );

  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [shareDrawerOpen, setShareDrawerOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Hero image is 208px (h-52) and lives 68px behind the sticky bar (via -mt-17),
  // so the bar is fully off the hero once the container has scrolled 140px.
  const HERO_PAST_THRESHOLD = coverPhotoUrl ? 140 : 0;

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const next = el.scrollTop > HERO_PAST_THRESHOLD;
    setScrolled((prev) => (prev === next ? prev : next));
  }, [HERO_PAST_THRESHOLD]);

  const { setHidden } = useNavVisibility();

  useEffect(() => {
    setHidden(selectionMode);
    return () => setHidden(false);
  }, [selectionMode, setHidden]);

  const onEnterSelection = useCallback(() => {
    setSelectionMode(true);
  }, []);

  const onExitSelection = useCallback(() => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  }, []);

  const onToggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const onSelectAll = useCallback((ids: string[]) => {
    setSelectedIds(new Set(ids));
  }, []);

  const handleShareTypeSelect = useCallback(
    async (type: "gallery" | "timeline") => {
      setShareDrawerOpen(false);

      if (selectedIds.size === 0) {
        setSelectionMode(true);
        return;
      }

      const photoIds = Array.from(selectedIds);
      const result = await generateShareLink(projectId, photoIds, type);

      if (!result.ok) {
        toast.error(`Share failed: ${result.error}`);
        return;
      }

      const url = `${window.location.origin}/share/${result.token}`;

      try {
        await navigator.clipboard.writeText(url);
        toast.success("Share link copied to clipboard");
      } catch {
        toast.error("Couldn't copy link — long-press to copy", {
          description: url,
        });
      }

      setSelectionMode(false);
      setSelectedIds(new Set());
    },
    [selectedIds, projectId],
  );

  return (
    <div ref={scrollRef} onScroll={handleScroll} className="h-full overflow-y-auto">
      <ProjectHero
        coverPhotoUrl={coverPhotoUrl}
        projectId={projectId}
        disabled={selectionMode}
        scrolled={scrolled}
        onShareClick={canShare ? () => setShareDrawerOpen(true) : undefined}
      />
      <div className="flex flex-col px-4 pt-4">
        <span className="text-2xl text-foreground font-bold">
          {projectName}
        </span>
        <span className="text-sm text-muted-foreground font-normal">
          {projectAddress}
        </span>
      </div>
      <ProjectTabs
        projectId={projectId}
        photos={photos}
        documents={documents}
        selectionMode={selectionMode}
        selectedIds={selectedIds}
        onEnterSelection={onEnterSelection}
        onExitSelection={onExitSelection}
        onToggleSelect={onToggleSelect}
        onSelectAll={onSelectAll}
        onShareClick={canShare ? () => setShareDrawerOpen(true) : undefined}
        onOpenPhoto={photoViewer.open}
      />
      <PhotoViewer
        photos={viewerPhotos}
        openId={photoViewer.openId}
        site={siteLocation}
        onShow={photoViewer.show}
        onClose={photoViewer.close}
        onSaveNote={handleSaveNote}
      />
      <ShareDrawer
        open={shareDrawerOpen}
        onOpenChange={setShareDrawerOpen}
        onTypeSelect={handleShareTypeSelect}
      />
    </div>
  );
}

export default ProjectShell;
