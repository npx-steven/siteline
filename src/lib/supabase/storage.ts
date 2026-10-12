import type { SupabaseClient } from "@supabase/supabase-js";

// The photos bucket is private, so every photo is served through a signed URL.
// URLs are signed for two hours but only handed out for the first hour (see
// the cache below), so any URL a page receives stays valid for at least an
// hour — enough for a normal session. A page left open longer picks up fresh
// URLs on its next server render.
export const PHOTO_URL_TTL_SECONDS = 2 * 60 * 60;
const PHOTO_URL_REUSE_MS = 60 * 60 * 1000;

// Every signing call mints a new token, so without this each render would
// give the same photo a new URL — and the browser and next/image cache by URL,
// so every visit re-downloaded and re-resized every photo. Reusing the URL
// lets both caches hit.
//
// Per server instance, keyed by storage path. Safe to share across callers:
// paths only ever come from rows the caller already read (through RLS, or
// through a share link's grant), and a signed URL grants exactly that object.
const MAX_CACHED_URLS = 5000;
const urlCache = new Map<string, { url: string; reuseUntil: number }>();

function rememberUrl(path: string, url: string, reuseUntil: number) {
  // Map keeps insertion order, so the first key is the oldest entry.
  if (urlCache.size >= MAX_CACHED_URLS) {
    const oldest = urlCache.keys().next().value;
    if (oldest !== undefined) urlCache.delete(oldest);
  }
  urlCache.set(path, { url, reuseUntil });
}

// Signs storage paths, reusing cached URLs and signing the rest in one round
// trip. Returns a path → URL map; a path that fails to sign is simply missing,
// so callers fall back as they would for a photo with no file.
export async function signPhotoUrls(
  supabase: SupabaseClient,
  paths: (string | null | undefined)[],
): Promise<Map<string, string>> {
  const unique = [...new Set(paths.filter((p): p is string => !!p))];
  const urls = new Map<string, string>();
  const now = Date.now();

  const missing: string[] = [];
  for (const path of unique) {
    const cached = urlCache.get(path);
    if (cached && cached.reuseUntil > now) {
      urls.set(path, cached.url);
    } else {
      missing.push(path);
    }
  }
  if (missing.length === 0) return urls;

  const { data, error } = await supabase.storage
    .from("photos")
    .createSignedUrls(missing, PHOTO_URL_TTL_SECONDS);

  if (error || !data) return urls;

  const reuseUntil = now + PHOTO_URL_REUSE_MS;
  for (const entry of data) {
    if (entry.path && entry.signedUrl) {
      urls.set(entry.path, entry.signedUrl);
      rememberUrl(entry.path, entry.signedUrl, reuseUntil);
    }
  }
  return urls;
}
