import { Photo, ViewerPhoto } from "@/types/db";
import { Coordinates } from "@/types/location";
import { groupPhotosByDate, haversineDistance } from "./helpers";

// A photo within this distance of the project's geocoded address counts as
// "on site". Addresses geocode to a single point (often the parcel centroid or
// street frontage) and phone GPS drifts tens of feet, so this is deliberately
// generous enough to cover a large lot.
export const ON_SITE_RADIUS_MI = 0.25;

// Decodes a PostGIS point as PostgREST returns it — hex EWKB such as
// "0101000020E6100000<lng f64><lat f64>". Also accepts GeoJSON and an
// already-decoded {lat, lng}, so callers don't need to know which they got.
export function parsePostgisPoint(value: unknown): Coordinates | null {
  if (!value) return null;

  if (typeof value === "object") {
    const v = value as Record<string, unknown>;
    if (typeof v.lat === "number" && typeof v.lng === "number") {
      return { lat: v.lat, lng: v.lng };
    }
    if (v.type === "Point" && Array.isArray(v.coordinates)) {
      const [lng, lat] = v.coordinates as number[];
      return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
    }
    return null;
  }

  if (typeof value !== "string" || !/^[0-9a-fA-F]+$/.test(value)) return null;
  if (value.length < 42) return null; // 1 + 4 + 16 bytes minimum

  const bytes = new Uint8Array(value.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(value.slice(i * 2, i * 2 + 2), 16);
  }
  const view = new DataView(bytes.buffer);
  const littleEndian = bytes[0] === 1;
  const type = view.getUint32(1, littleEndian);

  // Low bits carry the geometry type (1 = Point); 0x20000000 flags an SRID.
  if ((type & 0xff) !== 1) return null;
  const hasSrid = (type & 0x20000000) !== 0;
  const offset = 5 + (hasSrid ? 4 : 0);
  if (bytes.length < offset + 16) return null;

  const lng = view.getFloat64(offset, littleEndian);
  const lat = view.getFloat64(offset + 8, littleEndian);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

type ViewerPhotoRow = Pick<Photo, "id" | "created_at"> &
  Partial<
    Pick<
      Photo,
      | "captured_at"
      | "uploaded_by_name"
      | "location"
      | "location_source"
      | "size_bytes"
      | "width"
      | "height"
      | "note"
    >
  >;

export function toViewerPhoto(row: ViewerPhotoRow, url: string): ViewerPhoto {
  return {
    id: row.id,
    url,
    created_at: row.created_at,
    captured_at: row.captured_at ?? null,
    uploaded_by_name: row.uploaded_by_name ?? null,
    location: parsePostgisPoint(row.location),
    location_source: row.location_source ?? null,
    size_bytes: row.size_bytes ?? null,
    width: row.width ?? null,
    height: row.height ?? null,
    note: row.note ?? null,
  };
}

// The grid's visual order (day groups, newest first) flattened — the order
// the viewer swipes through. Must come from the same grouping the grid renders
// or a swipe would jump somewhere the user didn't expect.
export function orderPhotosForViewer<
  T extends { created_at: string; captured_at?: string | null },
>(photos: T[]): T[] {
  return Object.values(groupPhotosByDate(photos)).flat();
}

export function distanceFromSiteMiles(
  photo: Coordinates,
  site: Coordinates,
): number {
  return haversineDistance(photo.lat, photo.lng, site.lat, site.lng);
}

// Apple Maps on Apple devices (opens the native app), Google Maps elsewhere —
// a client opening a share link on Windows or Android shouldn't land on a
// maps.apple.com page.
export function mapsUrl({ lat, lng }: Coordinates): string {
  const isApple =
    typeof navigator !== "undefined" &&
    /iPhone|iPad|iPod|Macintosh/.test(navigator.userAgent);
  return isApple
    ? `https://maps.apple.com/?ll=${lat},${lng}&q=${encodeURIComponent("Photo location")}`
    : `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
}
