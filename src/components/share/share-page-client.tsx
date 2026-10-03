"use client";

import { getDateRange, groupPhotosByDate } from "@/lib/helpers";
import { SharedPhoto, ShareViewType } from "@/types/db";
import ShareHeader from "./share-header";
import { useMemo, useState } from "react";
import ShareViewToggle from "./share-view-toggle";
import ShareGalleryView from "./share-gallery-view";
import ShareTimelineView from "./share-timeline-view";
import PhotoViewer from "@/components/photo-viewer/photo-viewer";
import { usePhotoParam } from "@/components/photo-viewer/use-photo-param";
import { orderPhotosForViewer } from "@/lib/photos";
import { Coordinates } from "@/types/location";

type SharePageClientProps = {
  companyName: string;
  projectName: string;
  projectAddress: string;
  siteLocation: Coordinates | null;
  viewType: ShareViewType;
  sharedPhotos: SharedPhoto[];
  token: string;
};

function SharePageClient({
  companyName,
  projectName,
  projectAddress,
  siteLocation,
  viewType,
  sharedPhotos,
  token,
}: SharePageClientProps) {
  const photoViewer = usePhotoParam();
  const viewerPhotos = useMemo(
    () => orderPhotosForViewer(sharedPhotos),
    [sharedPhotos],
  );
  const dateRange = useMemo(() => getDateRange(sharedPhotos), [sharedPhotos]);
  const [viewMode, setViewMode] = useState<ShareViewType>(viewType);

  const groupPhotos = useMemo(
    () => groupPhotosByDate(sharedPhotos),
    [sharedPhotos],
  );
  return (
    <div>
      <ShareHeader
        companyName={companyName}
        projectName={projectName}
        projectAddress={projectAddress}
        dateRange={dateRange}
        photoCount={sharedPhotos.length}
        token={token}
      />
      <div className="px-4">
        <ShareViewToggle viewMode={viewMode} onViewChange={setViewMode} />
      </div>
      <div>
        {viewMode === "gallery" ? (
          <ShareGalleryView groups={groupPhotos} onOpen={photoViewer.open} />
        ) : (
          <ShareTimelineView groups={groupPhotos} onOpen={photoViewer.open} />
        )}
      </div>
      {/* Read-only: no onSaveNote, so the note shows only when one exists. */}
      <PhotoViewer
        photos={viewerPhotos}
        openId={photoViewer.openId}
        site={siteLocation}
        onShow={photoViewer.show}
        onClose={photoViewer.close}
      />
    </div>
  );
}

export default SharePageClient;
