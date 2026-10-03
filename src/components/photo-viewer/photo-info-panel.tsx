"use client";

import { useEffect, useId, useRef, useState } from "react";
import {
  IconClock,
  IconFile,
  IconMap2,
  IconMapPin,
  IconMapPinCheck,
  IconMapPinExclamation,
  IconMapPinOff,
  IconNote,
  IconPencil,
} from "@tabler/icons-react";
import { Spinner } from "@/components/ui/spinner";
import {
  formatDate,
  formatDistance,
  formatFileSize,
  formatTime,
  PHOTO_NOTE_MAX_LENGTH,
  userInitials,
} from "@/lib/helpers";
import {
  distanceFromSiteMiles,
  mapsUrl,
  ON_SITE_RADIUS_MI,
} from "@/lib/photos";
import { cn } from "@/lib/utils";
import { ViewerPhoto } from "@/types/db";
import { Coordinates } from "@/types/location";

type PhotoInfoPanelProps = {
  id: string;
  photo: ViewerPhoto;
  note: string | null;
  site: Coordinates | null;
  editingNote: boolean;
  onEditingNoteChange: (editing: boolean) => void;
  // Absent on the client share page — the note is read-only there and the
  // row only shows when one exists.
  onSaveNote?: (note: string) => Promise<boolean>;
};

function PhotoInfoPanel({
  id,
  photo,
  note,
  site,
  editingNote,
  onEditingNoteChange,
  onSaveNote,
}: PhotoInfoPanelProps) {
  const takenAt = new Date(photo.captured_at ?? photo.created_at);
  const fileDetails = [
    photo.size_bytes !== null ? formatFileSize(photo.size_bytes) : null,
    photo.width && photo.height ? `${photo.width} × ${photo.height}` : null,
  ].filter(Boolean);

  return (
    <section
      id={id}
      aria-label="Photo info"
      className="mx-3 mb-[max(0.75rem,env(safe-area-inset-bottom))] max-h-[min(60dvh,34rem)] overflow-y-auto overscroll-contain rounded-3xl bg-[#1c1c1e] px-4 sm:mx-auto sm:w-full sm:max-w-md"
    >
      {editingNote && onSaveNote ? (
        <NoteEditor
          initial={note ?? ""}
          onCancel={() => onEditingNoteChange(false)}
          onSave={onSaveNote}
        />
      ) : (
        <div className="divide-y divide-white/10">
          <InfoRow
            icon={
              <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white text-sm font-medium text-[#1c1c1e]">
                {userInitials(photo.uploaded_by_name)}
              </div>
            }
            label="Uploaded by"
            value={photo.uploaded_by_name ?? "Unknown"}
          />

          {/* "Taken" only when the file told us; otherwise be honest that this
              is the upload time. */}
          <InfoRow
            icon={<IconTile icon={IconClock} />}
            label={photo.captured_at ? "Taken" : "Uploaded"}
            value={`${formatDate(takenAt)} · ${formatTime(takenAt)}`}
          />

          <LocationRow location={photo.location} site={site} />

          {fileDetails.length > 0 && (
            <InfoRow
              icon={<IconTile icon={IconFile} />}
              label="File size"
              value={fileDetails.join(" · ")}
            />
          )}

          {onSaveNote ? (
            <button
              type="button"
              onClick={() => onEditingNoteChange(true)}
              className="flex w-full items-center gap-3 py-3 text-left"
              aria-label={note ? "Edit note" : "Add a note"}
            >
              <IconTile icon={IconNote} />
              <div className="min-w-0 flex-1">
                <p className="text-[13px] text-white/55">Note</p>
                {note ? (
                  <p className="line-clamp-3 whitespace-pre-wrap break-words text-[15px] font-medium text-white">
                    {note}
                  </p>
                ) : (
                  <p className="text-[15px] font-medium text-white/40">
                    Add a note
                  </p>
                )}
              </div>
              <IconPencil
                size={18}
                stroke={1.75}
                className="shrink-0 text-white/40"
              />
            </button>
          ) : (
            note && (
              <div className="flex items-start gap-3 py-3">
                <IconTile icon={IconNote} />
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] text-white/55">Note</p>
                  <p className="whitespace-pre-wrap break-words text-[15px] font-medium text-white">
                    {note}
                  </p>
                </div>
              </div>
            )
          )}
        </div>
      )}
    </section>
  );
}

function IconTile({
  icon: Icon,
  className,
}: {
  icon: React.ComponentType<{ size?: number; stroke?: number }>;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-white/10 text-white",
        className,
      )}
    >
      <Icon size={20} stroke={1.75} />
    </div>
  );
}

function InfoRow({
  icon,
  label,
  value,
  muted = false,
  action,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  muted?: boolean;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 py-3">
      {icon}
      <div className="min-w-0 flex-1">
        <p className="text-[13px] text-white/55">{label}</p>
        <p
          className={cn(
            "truncate text-[15px] font-semibold",
            muted ? "text-white/40" : "text-white",
          )}
        >
          {value}
        </p>
      </div>
      {action}
    </div>
  );
}

function LocationRow({
  location,
  site,
}: {
  location: Coordinates | null;
  site: Coordinates | null;
}) {
  if (!location) {
    return (
      <InfoRow
        icon={<IconTile icon={IconMapPinOff} />}
        label="Location"
        value="Not recorded"
        muted
      />
    );
  }

  const openInMaps = (
    <a
      href={mapsUrl(location)}
      target="_blank"
      rel="noopener noreferrer"
      className="flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-white px-3.5 text-sm font-semibold text-[#1c1c1e] transition-colors active:bg-white/80"
    >
      <IconMap2 size={18} stroke={1.75} />
      Open in Maps
    </a>
  );

  // No geocoded site to measure against — show where, not how far.
  if (!site) {
    return (
      <InfoRow
        icon={<IconTile icon={IconMapPin} />}
        label="Location"
        value={`${location.lat.toFixed(5)}, ${location.lng.toFixed(5)}`}
        action={openInMaps}
      />
    );
  }

  const miles = distanceFromSiteMiles(location, site);
  const onSite = miles <= ON_SITE_RADIUS_MI;

  return (
    <InfoRow
      icon={
        <IconTile
          icon={onSite ? IconMapPinCheck : IconMapPinExclamation}
          className={onSite ? undefined : "text-amber-400"}
        />
      }
      label={onSite ? "On site" : "Off site"}
      value={`${formatDistance(miles)} from site`}
      action={openInMaps}
    />
  );
}

function NoteEditor({
  initial,
  onCancel,
  onSave,
}: {
  initial: string;
  onCancel: () => void;
  onSave: (note: string) => Promise<boolean>;
}) {
  const fieldId = useId();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [value, setValue] = useState(initial);

  // Focus with the caret at the end — editing an existing note almost always
  // means adding to it.
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.focus();
    el.setSelectionRange(el.value.length, el.value.length);
  }, []);
  const [saving, setSaving] = useState(false);
  const unchanged = value.trim() === initial.trim();

  async function handleSave() {
    if (saving || unchanged) return;
    setSaving(true);
    const ok = await onSave(value);
    // On success the parent closes the editor, unmounting this component.
    if (!ok) setSaving(false);
  }

  return (
    <div className="py-4">
      <label htmlFor={fieldId} className="text-[13px] text-white/55">
        Note
      </label>
      <textarea
        id={fieldId}
        ref={textareaRef}
        rows={4}
        value={value}
        maxLength={PHOTO_NOTE_MAX_LENGTH}
        disabled={saving}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.preventDefault();
            e.stopPropagation();
            onCancel();
          } else if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            handleSave();
          }
        }}
        placeholder="What does this photo show? Progress, an issue, a location on site…"
        className="mt-2 w-full resize-none rounded-xl bg-white/10 px-3 py-2.5 text-base text-white outline-none placeholder:text-white/35 focus:ring-2 focus:ring-white/30 disabled:opacity-60"
      />
      <div className="mt-1 flex justify-between gap-3 text-xs text-white/40">
        <span>Visible to anyone you share this photo with.</span>
        <span className="tabular-nums">
          {value.length}/{PHOTO_NOTE_MAX_LENGTH}
        </span>
      </div>
      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="h-11 flex-1 rounded-full bg-white/10 text-sm font-semibold text-white transition-colors active:bg-white/20 disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || unchanged}
          className="flex h-11 flex-1 items-center justify-center rounded-full bg-white text-sm font-semibold text-[#1c1c1e] transition-colors active:bg-white/80 disabled:opacity-50"
        >
          {saving ? <Spinner className="size-5" /> : "Save note"}
        </button>
      </div>
    </div>
  );
}

export default PhotoInfoPanel;
