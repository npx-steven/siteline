"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { createPortal } from "react-dom";
import Lightbox, {
  ACTION_CLOSE,
  type ControllerRef,
  useController,
  useEvents,
  useLightboxState,
} from "yet-another-react-lightbox";
import Inline from "yet-another-react-lightbox/plugins/inline";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import "yet-another-react-lightbox/styles.css";
import {
  IconChevronLeft,
  IconChevronRight,
  IconPhotoOff,
} from "@tabler/icons-react";
import { toast } from "sonner";
import { Spinner } from "@/components/ui/spinner";
import { formatDayAndTime, photoTakenAt } from "@/lib/helpers";
import { cn } from "@/lib/utils";
import { ViewerPhoto } from "@/types/db";
import { Coordinates } from "@/types/location";
import PhotoInfoPanel from "./photo-info-panel";
import PhotoViewerTopBar from "./photo-viewer-top-bar";

type PhotoViewerProps = {
  // In display order — the same order the grid renders (orderPhotosForViewer).
  photos: ViewerPhoto[];
  openId: string | null;
  // The project's geocoded address, for the on-site check.
  site: Coordinates | null;
  onShow: (id: string) => void;
  onClose: () => void;
  // Resolves to an error message, or null on success. Omit for read-only.
  onSaveNote?: (photoId: string, note: string) => Promise<string | null>;
};

// Matches the Zoom plugin's double-tap window. A single tap waits this long
// before toggling the panel, so the first tap of a double-tap (zoom) doesn't
// flash the panel open and shut.
const DOUBLE_TAP_MS = 300;
const TAP_MAX_MOVE_PX = 10;
const TAP_MAX_DURATION_MS = 300;
const EXIT_MS = 200;

// Remembered across opens for the life of the page, so someone checking
// metadata photo by photo doesn't have to reopen the panel every time.
let panelOpenPreference = false;

const noopSubscribe = () => () => {};

function PhotoViewer(props: PhotoViewerProps) {
  // The viewer portals into document.body, which doesn't exist during SSR —
  // and a deep link (?photo=…) does render it on the server.
  const isClient = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
  const index = props.openId
    ? props.photos.findIndex((p) => p.id === props.openId)
    : -1;

  if (!isClient || index < 0) return null;
  return createPortal(
    <PhotoViewerDialog {...props} index={index} />,
    document.body,
  );
}

function PhotoViewerDialog({
  photos,
  index,
  site,
  onShow,
  onClose,
  onSaveNote,
}: PhotoViewerProps & { index: number }) {
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const controllerRef = useRef<ControllerRef>(null);
  const [panelOpen, setPanelOpen] = useState(panelOpenPreference);
  const [leaving, setLeaving] = useState(false);
  const [editingPhotoId, setEditingPhotoId] = useState<string | null>(null);
  // Saved notes show immediately, before router.refresh() brings them back
  // in props.
  const [noteOverrides, setNoteOverrides] = useState<
    Record<string, string | null>
  >({});

  const photo = photos[index];
  const note = photo.id in noteOverrides ? noteOverrides[photo.id] : photo.note;
  // Keyed by photo, so swiping away abandons the edit instead of carrying it
  // onto the next photo.
  const editingNote = editingPhotoId === photo.id;

  const togglePanel = useCallback(() => {
    setPanelOpen((open) => {
      panelOpenPreference = !open;
      return !open;
    });
  }, []);

  const exitTimer = useRef<number | null>(null);
  const requestClose = useCallback(() => {
    if (exitTimer.current !== null) return;
    setLeaving(true);
    exitTimer.current = window.setTimeout(onClose, EXIT_MS);
  }, [onClose]);
  // If the back button closes us mid-exit, the pending onClose must not fire
  // — it would pop a second history entry and leave the page.
  useEffect(
    () => () => {
      if (exitTimer.current !== null) clearTimeout(exitTimer.current);
    },
    [],
  );

  // Lock page scroll behind the viewer and hand focus back where it was.
  useEffect(() => {
    const html = document.documentElement;
    const previousOverflow = html.style.overflow;
    const previousFocus = document.activeElement as HTMLElement | null;
    html.style.overflow = "hidden";
    rootRef.current?.focus();
    return () => {
      html.style.overflow = previousOverflow;
      previousFocus?.focus?.();
    };
  }, []);

  // Keyboard: Escape closes, arrows page, "i" toggles info. When the lightbox
  // container itself has focus it handles Escape and arrows on its own.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest("textarea, input, .yarl__container")) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      if (e.key === "Escape") {
        e.preventDefault();
        requestClose();
      } else if (e.key === "ArrowLeft") {
        controllerRef.current?.prev();
      } else if (e.key === "ArrowRight") {
        controllerRef.current?.next();
      } else if (e.key === "i" && !editingNote) {
        togglePanel();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [requestClose, togglePanel, editingNote]);

  const tapHandlers = useSingleTap(togglePanel, !editingNote);

  const slides = useMemo(
    () =>
      photos.map((p) => ({
        src: p.url,
        alt: `Photo by ${p.uploaded_by_name ?? "unknown"}, ${formatDayAndTime(
          new Date(photoTakenAt(p)),
        )}`,
        width: p.width ?? undefined,
        height: p.height ?? undefined,
      })),
    [photos],
  );

  const handleView = useCallback(
    ({ index: next }: { index: number }) => {
      const nextPhoto = photos[next];
      if (nextPhoto && next !== index) onShow(nextPhoto.id);
    },
    [photos, index, onShow],
  );

  const handleSaveNote = useCallback(
    async (text: string) => {
      if (!onSaveNote) return false;
      const photoId = photo.id;
      const error = await onSaveNote(photoId, text);
      if (error) {
        toast.error("Couldn't save note", { description: error });
        return false;
      }
      setNoteOverrides((prev) => ({ ...prev, [photoId]: text.trim() || null }));
      setEditingPhotoId(null);
      toast.success(text.trim() ? "Note saved" : "Note removed");
      return true;
    },
    [onSaveNote, photo.id],
  );

  const showPanel = panelOpen || editingNote;

  return (
    <div
      ref={rootRef}
      role="dialog"
      aria-modal="true"
      aria-label="Photo viewer"
      tabIndex={-1}
      className={cn(
        "fixed inset-0 z-[100] flex flex-col bg-black text-white outline-none select-none",
        "animate-in fade-in-0 zoom-in-95 duration-200",
        leaving && "animate-out fade-out-0 zoom-out-95 fill-mode-forwards",
      )}
    >
      <PhotoViewerTopBar
        position={index + 1}
        total={photos.length}
        takenAt={photoTakenAt(photo)}
        panelOpen={showPanel}
        panelId={panelId}
        onClose={requestClose}
        onTogglePanel={editingNote ? () => {} : togglePanel}
      />

      {/* The stage shrinks as the panel grows (grid row below), and the
          lightbox re-fits the photo to it — so the photo sits above the panel
          rather than under it. */}
      <div className="relative min-h-0 flex-1" {...tapHandlers}>
        <Lightbox
          plugins={[Inline, Zoom]}
          slides={slides}
          index={index}
          on={{ view: handleView }}
          carousel={{
            finite: true,
            preload: 2,
            padding: 0,
            spacing: 24,
            imageFit: "contain",
          }}
          controller={{
            ref: controllerRef,
            closeOnPullDown: true,
            closeOnBackdropClick: false,
            // Inline mode defaults to pan-y so a page can scroll past it;
            // full screen, every gesture belongs to the viewer.
            touchAction: "none",
            disableSwipeNavigation: editingNote,
          }}
          zoom={{
            maxZoomPixelRatio: 2,
            doubleTapDelay: DOUBLE_TAP_MS,
            doubleClickDelay: DOUBLE_TAP_MS,
            // Three double-tap steps to full zoom (~2–3× each on a phone
            // photo) instead of the default two giant ones.
            doubleClickMaxStops: 3,
            scrollToZoom: true,
          }}
          animation={{ swipe: 250 }}
          render={{
            buttonZoom: () => null,
            buttonPrev: () => <NavButton direction="prev" />,
            buttonNext: () => <NavButton direction="next" />,
            iconLoading: () => <Spinner className="size-7 text-white/60" />,
            iconError: () => (
              <div className="flex flex-col items-center gap-2 text-white/50">
                <IconPhotoOff size={40} stroke={1.5} />
                <span className="text-sm">Couldn&apos;t load photo</span>
              </div>
            ),
            controls: () => <CloseBridge onClose={requestClose} />,
          }}
          styles={{
            root: { "--yarl__color_backdrop": "transparent" },
          }}
        />
      </div>

      <div
        className={cn(
          "grid shrink-0 transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none",
          showPanel ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
        inert={!showPanel}
      >
        <div className="min-h-0 overflow-hidden">
          <div
            className={cn(
              "pt-3 transition-[opacity,translate] duration-300 ease-out motion-reduce:transition-none",
              showPanel ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0",
            )}
          >
            <PhotoInfoPanel
              id={panelId}
              photo={photo}
              note={note}
              site={site}
              editingNote={editingNote}
              onEditingNoteChange={(editing) =>
                setEditingPhotoId(editing ? photo.id : null)
              }
              onSaveNote={onSaveNote ? handleSaveNote : undefined}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// The lightbox's own close paths — pull down, and Escape while it has focus —
// publish ACTION_CLOSE, which the Inline plugin otherwise swallows.
function CloseBridge({ onClose }: { onClose: () => void }) {
  const { subscribe } = useEvents();
  useEffect(() => subscribe(ACTION_CLOSE, onClose), [subscribe, onClose]);
  return null;
}

// Arrow buttons for mouse users only; touch screens swipe.
function NavButton({ direction }: { direction: "prev" | "next" }) {
  const { prev, next } = useController();
  const { currentIndex, slides } = useLightboxState();
  const isPrev = direction === "prev";
  const atEnd = isPrev ? currentIndex === 0 : currentIndex === slides.length - 1;
  if (atEnd) return null;

  const Icon = isPrev ? IconChevronLeft : IconChevronRight;
  return (
    <button
      type="button"
      aria-label={isPrev ? "Previous photo" : "Next photo"}
      onClick={() => (isPrev ? prev() : next())}
      className={cn(
        "absolute top-1/2 hidden size-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-sm transition-colors hover:bg-white/25 [@media(hover:hover)_and_(pointer:fine)]:flex",
        isPrev ? "left-4" : "right-4",
      )}
    >
      <Icon size={22} stroke={2} />
    </button>
  );
}

// Fires `onTap` for a single, stationary tap anywhere on the stage — photo or
// the letterbox around it — but not for swipes, pulls, pinches, or either tap
// of a double-tap (that one belongs to zoom). Listens in the capture phase so
// the lightbox's own pointer handling can't hide events from it.
function useSingleTap(onTap: () => void, enabled: boolean) {
  const onTapRef = useRef(onTap);
  useEffect(() => {
    onTapRef.current = onTap;
  }, [onTap]);

  const pointers = useRef(new Set<number>());
  const start = useRef<{ x: number; y: number; t: number } | null>(null);
  const lastTapAt = useRef(0);
  const timer = useRef<number | null>(null);

  const cancel = useCallback(() => {
    if (timer.current !== null) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);
  useEffect(() => cancel, [cancel]);

  return useMemo(
    () => ({
      onPointerDownCapture: (e: React.PointerEvent) => {
        // A primary pointer starts a fresh gesture; clear any pointer whose
        // up event landed outside the stage.
        if (e.isPrimary) pointers.current.clear();
        pointers.current.add(e.pointerId);
        if (pointers.current.size > 1) {
          start.current = null; // pinch
          cancel();
          return;
        }
        start.current = { x: e.clientX, y: e.clientY, t: e.timeStamp };
      },
      onPointerUpCapture: (e: React.PointerEvent) => {
        pointers.current.delete(e.pointerId);
        const s = start.current;
        start.current = null;
        if (!enabled || !s) return;
        if (e.pointerType === "mouse" && e.button !== 0) return;
        if ((e.target as Element).closest("button, a")) return;

        const moved = Math.hypot(e.clientX - s.x, e.clientY - s.y);
        if (moved > TAP_MAX_MOVE_PX || e.timeStamp - s.t > TAP_MAX_DURATION_MS)
          return;

        if (e.timeStamp - lastTapAt.current < DOUBLE_TAP_MS) {
          lastTapAt.current = 0;
          cancel();
          return;
        }
        lastTapAt.current = e.timeStamp;
        cancel();
        timer.current = window.setTimeout(() => {
          timer.current = null;
          onTapRef.current();
        }, DOUBLE_TAP_MS);
      },
      onPointerCancelCapture: (e: React.PointerEvent) => {
        pointers.current.delete(e.pointerId);
        start.current = null;
      },
    }),
    [enabled, cancel],
  );
}

export default PhotoViewer;
