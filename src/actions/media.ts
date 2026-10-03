"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getAuthUser } from "./auth";
import { PHOTO_NOTE_MAX_LENGTH } from "@/lib/helpers";

type Bucket = "photos" | "documents";

export async function deleteMediaAction(
  bucket: Bucket,
  ids: string[],
  projectId: string,
): Promise<{ error: string | null }> {
  if (ids.length === 0) return { error: null };

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const user = await getAuthUser();
  if (!user) return { error: "Not authenticated" };

  const { data: rows, error: fetchError } = await supabase
    .from(bucket)
    .select("id, storage_path")
    .eq("project_id", projectId)
    .in("id", ids);

  if (fetchError) return { error: `Lookup failed: ${fetchError.message}` };
  if (!rows || rows.length !== ids.length) {
    return { error: "One or more items not found for this project" };
  }

  // Delete the rows FIRST and let RLS be the gate. An RLS-blocked DELETE
  // removes zero rows *without* raising an error, so the affected-row count is
  // the only reliable signal. Removing from storage first would strip the bytes
  // while leaving the rows behind — a permanently broken gallery.
  const { data: deleted, error: deleteError } = await supabase
    .from(bucket)
    .delete()
    .eq("project_id", projectId)
    .in("id", ids)
    .select("id, storage_path");

  if (deleteError) return { error: `Database: ${deleteError.message}` };

  if (!deleted || deleted.length === 0) {
    return {
      error: `You don't have permission to delete ${
        bucket === "photos" ? "photos" : "documents"
      } from this project.`,
    };
  }

  // Only clean up bytes for rows that actually went away.
  const { error: storageError } = await supabase.storage
    .from(bucket)
    .remove(deleted.map((row) => row.storage_path));

  revalidatePath(`/projects/${projectId}`);

  // The rows are gone either way, so this is not a failed delete — just
  // unreferenced bytes left in the bucket, which is recoverable.
  if (storageError) {
    return { error: `Removed, but file cleanup failed: ${storageError.message}` };
  }

  if (deleted.length !== ids.length) {
    return {
      error: `Deleted ${deleted.length} of ${ids.length} — you may not have permission for the rest.`,
    };
  }

  return { error: null };
}

export async function getMediaDownloadsAction(
  bucket: Bucket,
  ids: string[],
  projectId: string,
): Promise<{
  error: string | null;
  files: { url: string; name: string }[];
}> {
  if (ids.length === 0) return { error: null, files: [] };

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const user = await getAuthUser();
  if (!user) return { error: "Not authenticated", files: [] };

  const { data: rows, error: fetchError } =
    bucket === "documents"
      ? await supabase
          .from("documents")
          .select("id, storage_path, name")
          .eq("project_id", projectId)
          .in("id", ids)
      : await supabase
          .from("photos")
          .select("id, storage_path")
          .eq("project_id", projectId)
          .in("id", ids);

  if (fetchError)
    return { error: `Lookup failed: ${fetchError.message}`, files: [] };
  if (!rows || rows.length !== ids.length)
    return { error: "One or more items not found for this project", files: [] };

  const paths = rows.map((row) => row.storage_path);
  const { data: signed, error: signedError } = await supabase.storage
    .from(bucket)
    .createSignedUrls(paths, 60);

  if (signedError || !signed)
    return { error: `Storage: ${signedError?.message ?? "unknown"}`, files: [] };

  const files: { url: string; name: string }[] = [];
  signed.forEach((entry, i) => {
    if (!entry.signedUrl) return;
    const row = rows[i];
    const fallbackName = row.storage_path.split("/").pop() ?? "download";
    const name =
      "name" in row && row.name ? row.name : fallbackName;
    files.push({ url: entry.signedUrl, name });
  });

  return { error: null, files };
}

export async function updatePhotoNoteAction(
  projectId: string,
  photoId: string,
  note: string,
): Promise<{ error: string | null }> {
  const trimmed = note.trim();
  if (trimmed.length > PHOTO_NOTE_MAX_LENGTH) {
    return {
      error: `Notes are limited to ${PHOTO_NOTE_MAX_LENGTH} characters.`,
    };
  }

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const user = await getAuthUser();
  if (!user) return { error: "Not authenticated" };

  // As with delete, an RLS-blocked UPDATE changes zero rows without raising,
  // so the returned rows are the only reliable signal it landed.
  const { data: updated, error } = await supabase
    .from("photos")
    .update({ note: trimmed || null })
    .eq("project_id", projectId)
    .eq("id", photoId)
    .select("id");

  if (error) return { error: `Could not save note: ${error.message}` };
  if (!updated || updated.length === 0) {
    return { error: "You don't have permission to edit this photo." };
  }

  revalidatePath(`/projects/${projectId}`);
  return { error: null };
}
