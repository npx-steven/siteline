import type { SupabaseClient } from "@supabase/supabase-js";

// The photos bucket is private, so every photo is served through a signed URL.
// An hour covers a normal session; a page left open longer picks up fresh
// URLs on its next server render.
export const PHOTO_URL_TTL_SECONDS = 60 * 60;

// Signs storage paths in one round trip. Returns a path → URL map; a path that
// fails to sign is simply missing, so callers fall back as they would for a
// photo with no file.
export async function signPhotoUrls(
  supabase: SupabaseClient,
  paths: (string | null | undefined)[],
): Promise<Map<string, string>> {
  const unique = [...new Set(paths.filter((p): p is string => !!p))];
  if (unique.length === 0) return new Map();

  const { data, error } = await supabase.storage
    .from("photos")
    .createSignedUrls(unique, PHOTO_URL_TTL_SECONDS);

  if (error || !data) return new Map();

  const urls = new Map<string, string>();
  for (const entry of data) {
    if (entry.path && entry.signedUrl) urls.set(entry.path, entry.signedUrl);
  }
  return urls;
}
