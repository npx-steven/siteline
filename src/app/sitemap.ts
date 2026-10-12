import type { MetadataRoute } from "next";
import { INDEXABLE_PATHS, IS_INDEXABLE, SITE_URL } from "@/lib/site";

// Only public, canonical, absolute URLs belong here. No lastModified: Google
// ignores priority/changefreq and only trusts lastmod when it is accurate, and
// there is no real per-page modification date to report. Add one per entry
// when a page has content that genuinely changes.
export default function sitemap(): MetadataRoute.Sitemap {
  const base = SITE_URL;
  if (!IS_INDEXABLE || !base) return [];

  // The root is written with its trailing slash, matching the canonical URL.
  return INDEXABLE_PATHS.map((path) => ({ url: `${base}${path}` }));
}
