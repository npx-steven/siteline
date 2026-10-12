"use client";

import { uploadMediaAction } from "@/actions/upload";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { checkUploadSize, getCurrentPosition } from "@/lib/helpers";
import { PhotoOrigin, PhotoUploadMeta } from "@/lib/photo-metadata";
import { preparePhotoUpload } from "@/lib/photo-upload";
import { toast } from "sonner";

import {
  IconUpload,
  IconCamera,
  IconScan,
  IconPaperclip,
} from "@tabler/icons-react";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

type AddMediaDrawerProps = {
  projectId: string;
  activeTab: "photos" | "documents";
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function AddMediaDrawer({
  projectId,
  activeTab,
  open,
  onOpenChange,
}: AddMediaDrawerProps) {
  const photoInputRef = useRef<HTMLInputElement>(null);
  const documentInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const router = useRouter();

  const handleFileChange =
    (bucket: "photos" | "documents", origin: PhotoOrigin = "library") =>
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      // Clear the input so re-picking the same file still fires onChange.
      e.target.value = "";
      if (!file || isUploading) return;

      const label = bucket === "photos" ? "Photo" : "Document";

      setIsUploading(true);
      const toastId = toast.loading(`Uploading ${label.toLowerCase()}…`);

      // Photos are shrunk on the device first. Device GPS only stands in for
      // a fresh camera capture: a camera-roll pick without EXIF GPS uploads
      // with no location rather than wherever the phone happens to be now.
      let upload = file;
      let meta: PhotoUploadMeta | null = null;
      if (bucket === "photos") {
        ({ file: upload, meta } = await preparePhotoUpload(file, {
          origin,
          getDeviceLocation: () => getCurrentPosition().catch(() => null),
        }));
      }

      // Checked after resizing, so a large camera original that shrinks
      // under the limit still goes through.
      const sizeError = checkUploadSize(upload);
      if (sizeError) {
        setIsUploading(false);
        toast.error(`${label} is too large`, {
          id: toastId,
          description: sizeError,
        });
        return;
      }

      const { error } = await uploadMediaAction(upload, bucket, projectId, meta);

      setIsUploading(false);

      if (error) {
        toast.error(`${label} upload failed`, {
          id: toastId,
          description: error,
        });
        return;
      }

      toast.success(`${label} added`, { id: toastId });
      onOpenChange(false);
      router.refresh();
    };

  return (
    <Drawer open={open} onOpenChange={onOpenChange} direction="bottom">
      <DrawerContent
        className="rounded-t-3xl bg-background"
        aria-describedby={undefined}
        autoFocus={false}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DrawerHeader className="flex-1 align-middle">
          <DrawerTitle className="text-sm font-medium text-foreground"></DrawerTitle>
        </DrawerHeader>
        <div
          className="w-full px-4 pb-12 flex flex-col gap-2 aria-busy:opacity-60"
          aria-busy={isUploading}
        >
          {activeTab === "photos" ? (
            <>
              <button
                onClick={() => photoInputRef.current?.click()}
                disabled={isUploading}
                className="flex flex-row border bg-white items-center gap-4 w-full rounded-2xl disabled:pointer-events-none"
              >
                <div className="p-4 flex items-center justify-center">
                  <IconUpload
                    size={24}
                    stroke={1.5}
                    className="text-foreground"
                  />
                </div>
                <span className="text-base font-semibold text-foreground">
                  Upload Photo
                </span>
              </button>
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                disabled={isUploading}
                onChange={handleFileChange("photos")}
              />

              <label className="flex flex-row border bg-white items-center gap-4 w-full rounded-2xl cursor-pointer">
                <div className="p-4 flex items-center justify-center">
                  <IconCamera
                    size={24}
                    stroke={1.5}
                    className="text-foreground"
                  />
                </div>
                <span className="text-base font-semibold text-foreground">
                  Take Photo
                </span>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  disabled={isUploading}
                  onChange={handleFileChange("photos", "camera")}
                />
              </label>
            </>
          ) : (
            <>
              <button
                onClick={() => documentInputRef.current?.click()}
                disabled={isUploading}
                className="flex flex-row border bg-white items-center gap-4 w-full rounded-2xl disabled:pointer-events-none"
              >
                <div className="p-4 flex items-center justify-center">
                  <IconPaperclip
                    size={24}
                    stroke={1.5}
                    className="text-foreground"
                  />
                </div>
                <span className="text-base font-semibold text-foreground">
                  Add Files
                </span>
              </button>
              <input
                ref={documentInputRef}
                type="file"
                accept=".pdf,image/*,.doc,.docx,.xls,.xlsx"
                className="hidden"
                disabled={isUploading}
                onChange={handleFileChange("documents")}
              />
              <label className="flex flex-row border bg-white items-center gap-4 w-full rounded-2xl cursor-pointer">
                <div className="p-4 flex items-center justify-center">
                  <IconScan
                    size={24}
                    stroke={1.5}
                    className="text-foreground"
                  />
                </div>
                <span className="text-base font-semibold text-foreground">
                  Scan Document
                </span>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  disabled={isUploading}
                  onChange={handleFileChange("documents")}
                />
              </label>
            </>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}

export default AddMediaDrawer;
