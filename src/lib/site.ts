// Single source of truth for the canonical site origin and whether search
// engines may index it. robots.ts and sitemap.ts both read from here so they
// can never disagree.
//
// Set NEXT_PUBLIC_SITE_URL to the real production origin (e.g.
// https://siteline.app). Until then — and on any *.vercel.app deployment,
// preview or production — the site stays fully closed to crawlers.

function parseOrigin(raw: string | undefined): URL | null {
  if (!raw) return null;
  try {
    const url = new URL(raw.trim());
    return url.protocol === "https:" || url.protocol === "http:" ? url : null;
  } catch {
    return null;
  }
}

const origin = parseOrigin(process.env.NEXT_PUBLIC_SITE_URL);

// URL.origin drops any path, query and trailing slash, so
// `${SITE_URL}/path` is always well formed.
export const SITE_URL: string | null = origin?.origin ?? null;

export const IS_INDEXABLE: boolean =
  origin !== null &&
  origin.protocol === "https:" &&
  !origin.hostname.endsWith(".vercel.app") &&
  origin.hostname !== "localhost" &&
  process.env.VERCEL_ENV !== "preview";

// Public marketing pages worth indexing. Everything else is either behind
// auth, a per-token private link, or a form with no search value.
export const INDEXABLE_PATHS = ["/"] as const;

// Auth-gated app sections. Crawlers only ever get a redirect here, so
// disallowing them just saves crawl budget.
export const PRIVATE_APP_PATHS = [
  "/account",
  "/onboarding",
  "/projects",
] as const;
