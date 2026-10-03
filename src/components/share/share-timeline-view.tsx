import { SharedPhoto } from "@/types/db";
import SharePhotoCard from "./share-photo-card";

function ShareTimelineView({
  groups,
  onOpen,
}: {
  groups: Record<string, SharedPhoto[]>;
  onOpen: (id: string) => void;
}) {
  return (
    <div className="px-4 py-6">
      <div className="flex flex-col">
        {Object.entries(groups).map(([label, photos]) => (
          <section
            key={label}
            className="relative border-l border-border pl-10 pb-10"
          >
            {/* node dot — centered on THIS section's left border */}
            <div className="absolute left-0 top-1.5 h-3 w-3 -translate-x-1/2 rounded-full border-border bg-foreground ring-4 ring-background" />

            {/* date header */}
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold">{label}</h2>
              </div>
              <span className="text-sm text-muted-foreground">
                {photos.length} photo{photos.length === 1 ? "" : "s"}
              </span>
            </div>

            {/* photo grid */}
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              {photos.map((photo) => (
                <SharePhotoCard key={photo.id} photo={photo} onOpen={onOpen} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

export default ShareTimelineView;
