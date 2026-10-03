import { LocationSource } from "@/types/db";
import { Coordinates } from "@/types/location";

export type PhotoUploadMeta = {
  capturedAt: string | null;
  width: number | null;
  height: number | null;
  location: Coordinates | null;
  locationSource: LocationSource | null;
};

// "camera": captured in-app just now, so the phone's current GPS and clock
// describe the photo. "library": picked from the camera roll, possibly days
// later and miles away — only the file's own EXIF can be trusted.
export type PhotoOrigin = "camera" | "library";

type ReadPhotoMetadataOptions = {
  origin: PhotoOrigin;
  // Called only for camera captures whose file carries no EXIF GPS — so a
  // geotagged photo never waits on a GPS fix.
  getDeviceLocation?: () => Promise<Coordinates | null>;
};

// Reads when/where a photo was taken and its display size, on the device,
// before upload. Every step is best-effort: a HEIC the browser can't decode or
// a file with stripped EXIF still uploads, just with less metadata.
export async function readPhotoMetadata(
  file: File,
  { origin, getDeviceLocation }: ReadPhotoMetadataOptions,
): Promise<PhotoUploadMeta> {
  const [exif, dimensions] = await Promise.all([
    readExif(file),
    readDimensions(file),
  ]);

  let location = exif.location;
  let locationSource: LocationSource | null = location ? "exif" : null;

  if (!location && origin === "camera" && getDeviceLocation) {
    location = await getDeviceLocation().catch(() => null);
    locationSource = location ? "device" : null;
  }

  const capturedAt =
    exif.capturedAt ??
    (origin === "camera" ? new Date().toISOString() : null);

  return {
    capturedAt,
    width: dimensions?.width ?? null,
    height: dimensions?.height ?? null,
    location,
    locationSource,
  };
}

async function readExif(
  file: File,
): Promise<{ capturedAt: string | null; location: Coordinates | null }> {
  try {
    // Loaded on demand — only the upload path pays for the parser.
    const exifr = (await import("exifr")).default;

    const [tags, gps] = await Promise.all([
      exifr
        .parse(file, ["DateTimeOriginal", "CreateDate"])
        .catch(() => null) as Promise<Record<string, unknown> | null>,
      exifr.gps(file).catch(() => null),
    ]);

    const taken = tags?.DateTimeOriginal ?? tags?.CreateDate;
    const capturedAt =
      taken instanceof Date && !Number.isNaN(taken.getTime())
        ? taken.toISOString()
        : null;

    const location =
      gps &&
      Number.isFinite(gps.latitude) &&
      Number.isFinite(gps.longitude) &&
      !(gps.latitude === 0 && gps.longitude === 0)
        ? { lat: gps.latitude, lng: gps.longitude }
        : null;

    return { capturedAt, location };
  } catch {
    return { capturedAt: null, location: null };
  }
}

// Decoded through an <img> so EXIF orientation is applied — a portrait shot
// stored sideways reports portrait dimensions, matching what the viewer shows.
function readDimensions(
  file: File,
): Promise<{ width: number; height: number } | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    const done = (result: { width: number; height: number } | null) => {
      URL.revokeObjectURL(url);
      resolve(result);
    };
    img.onload = () =>
      done(
        img.naturalWidth > 0 && img.naturalHeight > 0
          ? { width: img.naturalWidth, height: img.naturalHeight }
          : null,
      );
    img.onerror = () => done(null);
    img.src = url;
  });
}
