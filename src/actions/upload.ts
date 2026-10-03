"use server";

import { cookies } from "next/headers";
import { getAuthUser } from "./auth";
import { createClient } from "@/lib/supabase/server";
import type { PhotoUploadMeta } from "@/lib/photo-metadata";

export async function uploadMediaAction(
  file: File,
  bucket: "photos" | "documents",
  projectId: string,
  meta: PhotoUploadMeta | null = null,
): Promise<{ error: string | null }> {
  const cookieStore = await cookies();
  const supabase = await createClient(cookieStore);

  // Check if user is authticated
  const user = await getAuthUser();
  if (!user) {
    return { error: "User is not authenticated." };
  }

  // Fetch user profile
  const { data: profile } = await supabase
    .from("users")
    .select("full_name, company_id")
    .eq("id", user.id)
    .single();
  if (!profile) {
    return { error: "User doesnt exit in user table." };
  }
  if (!profile.company_id) {
    return { error: "User has no company." };
  }

  // projectId arrives from the client, so confirm it belongs to the caller's
  // company before writing — otherwise a row could be filed against another
  // company's project.
  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("company_id", profile.company_id)
    .maybeSingle();

  if (!project) {
    return { error: "Project not found." };
  }

  // Construct file path
  const fileId = crypto.randomUUID();
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "bin";
  const filePath = `${profile.company_id}/${projectId}/${fileId}.${ext}`;

  // Upload file to storage
  const { data: storageData, error: storageError } = await supabase.storage
    .from(bucket)
    .upload(filePath, file);

  if (storageError) {
    return { error: `Storage: ${storageError.message}` };
  }

  const photoMeta = bucket === "photos" ? sanitizePhotoMeta(meta) : null;

  // Insert file into table row
  const { error: tableError } = await supabase.from(bucket).insert({
    id: fileId,
    project_id: projectId,
    uploaded_by: user.id,
    uploaded_by_name: profile.full_name,
    storage_path: storageData.path,
    size_bytes: file.size,
    ...(photoMeta && {
      captured_at: photoMeta.capturedAt,
      width: photoMeta.width,
      height: photoMeta.height,
      ...(photoMeta.location && {
        location: `POINT(${photoMeta.location.lng} ${photoMeta.location.lat})`,
        location_source: photoMeta.locationSource,
      }),
    }),
    ...(bucket === "documents" && { name: file.name }),
  });
  if (tableError) {
    // The bytes are already in the bucket, so drop them rather than leaving an
    // unreferenced file behind. Reachable today: the documents INSERT policy is
    // owner-or-pm, so a crew member's document upload fails right here.
    await supabase.storage.from(bucket).remove([storageData.path]);

    if (tableError.code === "42501") {
      return {
        error: `You don't have permission to add ${bucket} to this project.`,
      };
    }
    return { error: `Could not save file: ${tableError.message}` };
  }

  return { error: null };
}

// The metadata is read on the device and arrives from the client, so treat it
// as untrusted: drop anything malformed rather than failing the upload over it.
function sanitizePhotoMeta(meta: PhotoUploadMeta | null): PhotoUploadMeta {
  const empty: PhotoUploadMeta = {
    capturedAt: null,
    width: null,
    height: null,
    location: null,
    locationSource: null,
  };
  if (!meta) return empty;

  const taken = meta.capturedAt ? new Date(meta.capturedAt) : null;
  // A day of slack for device clock and time zone skew; nothing pre-2000.
  const capturedAt =
    taken &&
    !Number.isNaN(taken.getTime()) &&
    taken.getTime() <= Date.now() + 24 * 60 * 60 * 1000 &&
    taken.getUTCFullYear() >= 2000
      ? taken.toISOString()
      : null;

  const dimension = (n: unknown) =>
    typeof n === "number" && Number.isInteger(n) && n > 0 && n <= 100_000
      ? n
      : null;
  const width = dimension(meta.width);
  const height = dimension(meta.height);

  const loc = meta.location;
  const validLocation =
    loc &&
    Number.isFinite(loc.lat) &&
    Number.isFinite(loc.lng) &&
    Math.abs(loc.lat) <= 90 &&
    Math.abs(loc.lng) <= 180;
  const validSource =
    meta.locationSource === "exif" || meta.locationSource === "device";

  return {
    capturedAt,
    width: width && height ? width : null,
    height: width && height ? height : null,
    location: validLocation && validSource ? { lat: loc.lat, lng: loc.lng } : null,
    locationSource: validLocation && validSource ? meta.locationSource : null,
  };
}
