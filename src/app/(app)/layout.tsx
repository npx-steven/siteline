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
import type { PhotoUploadMeta } from "@/lib/photo-metadata";
import { preparePhotoUpload } from "@/lib/photo-upload";
import type { Coordinates } from "@/types/location";
import {
  NavVisibilityProvider,
  useNavVisibility,
} from "@/lib/nav-visibility-context";

type PendingCapture = { file: File; meta: PhotoUploadMeta | null };
type CaptureDrawer = "picker" | "sheet";

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

  // The photo waiting for a project. Set only while the picker or the create
  // sheet is open for it — both are non-dismissible then, so the only ways
  // out are filing it or an explicit discard. Nothing can leave it behind for
  // an unrelated "+ New project" to pick up later.
  const [capture, setCaptureState] = useState<PendingCapture | null>(null);
  // Mirrors `capture` for callbacks that outlive a render (toast actions).
  const captureRef = useRef<PendingCapture | null>(null);
  const setCapture = (next: PendingCapture | null) => {
    captureRef.current = next;
    setCaptureState(next);
  };
  // The picker's thumbnail. Outlives `capture` so it doesn't blank out while
  // the drawer animates closed.
  const [previewFile, setPreviewFile] = useState<File | null>(null);

  const gpsRef = useRef<Promise<Coordinates | null> | null>(null);

  const handleCameraButtonPress = () => {
    gpsRef.current = getCurrentPosition().catch(() => null);
  };

  const openCapture = (pending: PendingCapture, drawer: CaptureDrawer) => {
    setCapture(pending);
    setPreviewFile(pending.file);
    if (drawer === "picker") setPickerOpen(true);
    else setSheetOpen(true);
  };

  // For failures with a photo in hand. The toast stays up until answered,
  // because closing it without a choice would silently drop the photo. Each
  // toast holds its own photo, so several can wait at once.
  const holdForRetry = (
    title: string,
    description: string,
    retry: () => void,
    id?: string | number,
  ) => {
    // Read when Discard is tapped, by which point it holds the toast's id.
    let toastId = id;
    toastId = toast.error(title, {
      id,
      description,
      duration: Infinity,
      dismissible: false,
      action: { label: "Retry", onClick: retry },
      // Sonner's built-in cancel button does nothing on a non-dismissible
      // toast, so Discard closes it by id. The data attributes keep Sonner's
      // cancel-button styling.
      cancel: (
        <button data-button data-cancel onClick={() => toast.dismiss(toastId)}>
          Discard
        </button>
      ),
    });
  };

  // Single funnel for the capture → upload step, so a failure can never be
  // mistaken for success by navigating to a project with no photo.
  const fileCapture = async (pending: PendingCapture, projectId: string) => {
    const toastId = toast.loading("Saving photo…");

    let error: string | null;
    try {
      ({ error } = await uploadMediaAction(
        pending.file,
        "photos",
        projectId,
        pending.meta,
      ));
    } catch {
      // The action never reached the server — usually no signal on site.
      error = "Check your connection and try again.";
    }

    if (error) {
      holdForRetry(
        "Photo not saved",
        error,
        () => void fileCapture(pending, projectId),
        toastId,
      );
      return;
    }

    toast.success("Photo saved to project", { id: toastId });
    router.push(`/projects/${projectId}`);
  };

  // Finds where the photo might belong and opens the picker, or the create
  // sheet when nothing fits.
  const routeCapture = async (
    pending: PendingCapture,
    coords: Coordinates | null,
  ) => {
    try {
      if (!coords) {
        // GPS failed entirely — fall back to a searchable list of all
        // company projects instead of routing straight to project creation.
        const { data: allProjects, error } = await getAllProjectsAction();

        if (error || !allProjects || allProjects.length === 0) {
          openCapture(pending, "sheet");
          return;
        }

        setPickerProjects(allProjects);
        setPickerCoords(null);
        openCapture(pending, "picker");
        return;
      }

      const { data: matches, error } = await findProjectsNearAction(coords);

      if (error || !matches || matches.length === 0) {
        openCapture(pending, "sheet");
        return;
      }

      setPickerProjects(matches);
      setPickerCoords(coords);
      openCapture(pending, "picker");
    } catch {
      holdForRetry(
        "Couldn't load your projects",
        "Your photo is safe here. Check your connection and try again.",
        () => void routeCapture(pending, coords),
      );
    }
  };

  const handleCameraCapture = async (photo: File) => {
    const gps = gpsRef.current ?? Promise.resolve(null);
    gpsRef.current = null;

    // Shrink the photo and read its metadata while the GPS fix settles. The
    // FAB always captures fresh, so the fix taken at button press describes
    // the photo when its own EXIF has none.
    const [{ file, meta }, coords] = await Promise.all([
      preparePhotoUpload(photo, {
        origin: "camera",
        getDeviceLocation: () => gps,
      }),
      gps,
    ]);

    // Reject oversized files before the user picks a project — Vercel would
    // 413 the action anyway. Checked after resizing, so most originals pass.
    const sizeError = checkUploadSize(file);
    if (sizeError) {
      toast.error("Photo is too large", { description: sizeError });
      return;
    }

    await routeCapture({ file, meta }, coords);
  };

  const handleProjectPicked = async (projectId: string) => {
    const pending = captureRef.current;
    setPickerOpen(false);
    setCapture(null);
    if (!pending) return;

    await fileCapture(pending, projectId);
  };

  const handleCreateNew = () => {
    setPickerOpen(false);
    setSheetOpen(true);
  };

  const handleProjectCreated = async (projectId: string) => {
    // Null when the sheet was opened from "+" rather than for a photo.
    const pending = captureRef.current;
    if (!pending) return;
    setCapture(null);

    await fileCapture(pending, projectId);
  };

  const discardCapture = (from: CaptureDrawer) => {
    const discarded = captureRef.current;
    setPickerOpen(false);
    setSheetOpen(false);
    setCapture(null);
    if (!discarded) return;

    toast("Photo discarded", {
      action: {
        label: "Undo",
        onClick: () => {
          // A newer photo already has the drawer.
          if (captureRef.current) return;
          openCapture(discarded, from);
        },
      },
    });
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
        onDiscardPhoto={capture ? () => discardCapture("sheet") : undefined}
      />
      <ProjectPickerDrawer
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        projects={pickerProjects}
        userCoords={pickerCoords}
        capturedFile={previewFile}
        onSelect={handleProjectPicked}
        onCreateNew={handleCreateNew}
        onDiscard={() => discardCapture("picker")}
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
