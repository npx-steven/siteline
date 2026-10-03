"use client";

import { cn } from "@/lib/utils";
import { useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import MobileNav from "@/components/mobile/mobile-nav";
import CreateProjectSheet from "@/components/project/create-project-sheet";
import ProjectPickerDrawer from "@/components/project/project-picker-drawer";
import { checkUploadSize, getCurrentPosition } from "@/lib/helpers";
import { toast } from "sonner";
import {
  findProjectsNearAction,
  getAllProjectsAction,
} from "@/actions/location";
import { uploadMediaAction } from "@/actions/upload";
import { readPhotoMetadata } from "@/lib/photo-metadata";
import type { Coordinates } from "@/types/location";
import {
  NavVisibilityProvider,
  useNavVisibility,
} from "@/lib/nav-visibility-context";

function AppLayoutInner({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { hidden } = useNavVisibility();
  const isOnboarding = pathname?.startsWith("/onboarding") ?? false;
  const [sheetOpen, setSheetOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerProjects, setPickerProjects] = useState<
    Array<{
      id: string;
      name: string;
      address: string;
      thumbnailUrl: string | null;
      photoCount: number;
      lastPhotoAt: string | null;
      projectLat: number | null;
      projectLng: number | null;
    }>
  >([]);
  const [pickerCoords, setPickerCoords] = useState<Coordinates | null>(null);
  const [capturedFile, setCapturedFile] = useState<File | null>(null);

  const pendingFileRef = useRef<File | null>(null);
  const pendingCoordsRef = useRef<Coordinates | null>(null);
  const gpsRef = useRef<Promise<Coordinates | null> | null>(null);

  const handleCameraButtonPress = () => {
    gpsRef.current = getCurrentPosition().catch(() => null);
  };

  // Single funnel for the capture → upload step, so a failure can never be
  // mistaken for success by navigating to a project with no photo.
  const uploadCapturedPhoto = async (
    file: File,
    projectId: string,
    coords: Coordinates | null,
  ): Promise<boolean> => {
    const toastId = toast.loading("Saving photo…");
    // The FAB always captures fresh, so the GPS fix taken at button press
    // describes the photo when its own EXIF has none.
    const meta = await readPhotoMetadata(file, {
      origin: "camera",
      getDeviceLocation: async () => coords,
    });
    const { error } = await uploadMediaAction(file, "photos", projectId, meta);

    if (error) {
      toast.error("Photo upload failed", { id: toastId, description: error });
      return false;
    }

    toast.success("Photo saved to project", { id: toastId });
    return true;
  };

  const handleCameraCapture = async (file: File) => {
    // Reject oversized files up front — Vercel would 413 the action anyway,
    // and the user should hear it before picking a project.
    const sizeError = checkUploadSize(file);
    if (sizeError) {
      gpsRef.current = null;
      toast.error("Photo is too large", { description: sizeError });
      return;
    }

    const coords = await (gpsRef.current ?? Promise.resolve(null));
    gpsRef.current = null;

    if (!coords) {
      // GPS failed entirely — fall back to a searchable list of all
      // company projects instead of routing straight to project creation.
      const { data: allProjects, error } = await getAllProjectsAction();

      if (error || !allProjects || allProjects.length === 0) {
        pendingFileRef.current = file;
        setSheetOpen(true);
        return;
      }

      pendingFileRef.current = file;
      pendingCoordsRef.current = null;
      setPickerProjects(allProjects);
      setPickerCoords(null);
      setCapturedFile(file);
      setPickerOpen(true);
      return;
    }

    const { data: matches, error } = await findProjectsNearAction(coords);

    if (error || !matches) {
      pendingFileRef.current = file;
      pendingCoordsRef.current = coords;
      setSheetOpen(true);
      return;
    }

    if (matches.length === 0) {
      pendingFileRef.current = file;
      pendingCoordsRef.current = coords;
      setSheetOpen(true);
    } else {
      pendingFileRef.current = file;
      pendingCoordsRef.current = coords;
      setPickerProjects(matches);
      setPickerCoords(coords);
      setCapturedFile(file);
      setPickerOpen(true);
    }
  };

  const handleProjectPicked = async (projectId: string) => {
    setPickerOpen(false);
    const file = pendingFileRef.current;
    const coords = pendingCoordsRef.current;
    if (!file) return;

    const ok = await uploadCapturedPhoto(file, projectId, coords);
    if (!ok) return; // keep the file pending so the user can retry

    pendingFileRef.current = null;
    pendingCoordsRef.current = null;
    router.push(`/projects/${projectId}`);
  };

  const handleCreateNew = () => {
    setPickerOpen(false);
    setSheetOpen(true);
  };

  const handleProjectCreated = async (projectId: string) => {
    const file = pendingFileRef.current;
    const coords = pendingCoordsRef.current;
    if (!file) return;

    const ok = await uploadCapturedPhoto(file, projectId, coords);
    if (!ok) return; // project exists; the photo can be retried from its page

    pendingFileRef.current = null;
    pendingCoordsRef.current = null;
    router.push(`/projects/${projectId}`);
  };

  return (
    <div className="relative h-dvh flex flex-col max-w-lg mx-auto">
      <div
        aria-hidden="true"
        className={cn(
          "absolute inset-0 z-60 pointer-events-none transition-opacity duration-300",
          hidden ? "opacity-100" : "opacity-0",
        )}
        style={{
          boxShadow:
            "inset 0 0 0 3px #2563eb, inset 0 0 60px 14px rgba(37, 99, 235, 0.45)",
        }}
      />
      <main className="flex-1 overflow-hidden">{children}</main>
      <CreateProjectSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onProjectCreated={handleProjectCreated}
      />
      <ProjectPickerDrawer
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        projects={pickerProjects}
        userCoords={pickerCoords}
        capturedFile={capturedFile}
        onSelect={handleProjectPicked}
        onCreateNew={handleCreateNew}
      />
      {!hidden && !isOnboarding && (
        <MobileNav
          onAddProject={() => setSheetOpen(true)}
          onCameraCapture={handleCameraCapture}
          onCameraButtonPress={handleCameraButtonPress}
        />
      )}
    </div>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <NavVisibilityProvider>
      <AppLayoutInner>{children}</AppLayoutInner>
    </NavVisibilityProvider>
  );
}
