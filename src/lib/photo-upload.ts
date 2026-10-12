import {
  type PhotoUploadMeta,
  type ReadPhotoMetadataOptions,
  readPhotoMetadata,
} from "./photo-metadata";

// Long edge of an uploaded photo. Plenty for full-screen viewing and pinch
// zoom on a phone, and turns a 3–5 MB camera original into roughly half a
// megabyte — the difference between seconds and a long wait on site cellular.
const MAX_EDGE_PX = 2048;
const JPEG_QUALITY = 0.8;

// Below this, an already-small JPEG/WebP goes up untouched: re-encoding would
// cost quality for little gain.
const SMALL_ENOUGH_BYTES = 1024 * 1024;

// What phone cameras produce. PNG and GIF (screenshots, scans) are left alone —
// re-encoding them as JPEG would blur text and drop transparency.
const RESIZABLE_TYPES = new Set([
  "image/jpeg",
  "image/heic",
  "image/heif",
  "image/webp",
]);
const HEIC_TYPES = new Set(["image/heic", "image/heif"]);

export type PreparedPhoto = {
  file: File;
  meta: PhotoUploadMeta;
};

// Shrinks a photo for upload and reads its metadata. EXIF is read from the
// original, since re-encoding through a canvas strips it; the stored width and
// height describe the file that is actually uploaded. Any step that fails
// falls back to the original file, so a photo is never lost to resizing.
export async function preparePhotoUpload(
  original: File,
  options: Omit<ReadPhotoMetadataOptions, "dimensions">,
): Promise<PreparedPhoto> {
  const resized = await resizePhoto(original);
  const meta = await readPhotoMetadata(original, {
    ...options,
    dimensions: resized?.dimensions ?? null,
  });
  return { file: resized?.file ?? original, meta };
}

type ResizedPhoto = {
  file: File;
  dimensions: { width: number; height: number };
};

async function resizePhoto(file: File): Promise<ResizedPhoto | null> {
  if (!RESIZABLE_TYPES.has(file.type)) return null;

  let bitmap: ImageBitmap;
  try {
    // from-image applies EXIF orientation, so a portrait shot stored sideways
    // comes out upright and the orientation is baked into the new pixels.
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    return null; // a format this browser can't decode uploads as-is
  }

  try {
    const keep: ResizedPhoto = {
      file,
      dimensions: { width: bitmap.width, height: bitmap.height },
    };

    const scale = Math.min(
      1,
      MAX_EDGE_PX / Math.max(bitmap.width, bitmap.height),
    );
    // HEIC is still converted when small: most browsers outside Safari can't
    // display it, and share links go to clients on any device.
    if (
      scale === 1 &&
      file.size <= SMALL_ENOUGH_BYTES &&
      !HEIC_TYPES.has(file.type)
    ) {
      return keep;
    }

    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return keep;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(bitmap, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY),
    );
    // Release the backing store now — iOS caps total canvas memory per page.
    canvas.width = 0;
    canvas.height = 0;

    // Not resized and no smaller: the original is the better upload.
    if (!blob || (scale === 1 && blob.size >= file.size)) return keep;

    const name = `${file.name.replace(/\.[^.]*$/, "") || "photo"}.jpg`;
    return {
      file: new File([blob], name, {
        type: "image/jpeg",
        lastModified: file.lastModified,
      }),
      dimensions: { width, height },
    };
  } finally {
    bitmap.close();
  }
}
