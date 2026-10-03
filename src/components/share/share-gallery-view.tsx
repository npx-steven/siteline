"use client";

import { SharedPhoto } from "@/types/db";
import SharePhotoCard from "./share-photo-card";

type ShareGalleryViewProps = {
  groups: Record<string, SharedPhoto[]>;
  onOpen: (id: string) => void;
};

function ShareGalleryView({ groups, onOpen }: ShareGalleryViewProps) {
  return (
    <div className="flex flex-col gap-8 px-4 py-6">
      {Object.entries(groups).map(([label, photos]) => (
        <section key={label}>
          {/* group header */}
          <div className="mb-4 flex items-center gap-2">
            <h2 className="text-lg font-bold text-foreground">{label}</h2>
            <span className="text-sm text-muted-foreground">
              · {photos.length} photo{photos.length === 1 ? "" : "s"}
            </span>
            <div className="ml-2 h-px flex-1 bg-border" />
          </div>

          {/* photo grid */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {photos.map((photo) => (
              <SharePhotoCard key={photo.id} photo={photo} onOpen={onOpen} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

export default ShareGalleryView;
