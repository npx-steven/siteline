import type { MetadataRoute } from "next";
import { IS_INDEXABLE, PRIVATE_APP_PATHS, SITE_URL } from "@/lib/site";

// Closed by default: until NEXT_PUBLIC_SITE_URL points at the real production
// domain (see lib/site.ts), every crawler is told to stay out and no sitemap
// is advertised.
//
// Once indexable, only the public marketing page is open. /share/* and
// /join/* are per-token private links and /sign-in, /sign-up are forms; those
// are kept out of results with an X-Robots-Tag: noindex header (next.config.ts)
// rather than a Disallow, because a crawler has to be able to fetch a page to
// see its noindex — a Disallowed URL can still be indexed from external links.
export default function robots(): MetadataRoute.Robots {
  if (!IS_INDEXABLE || !SITE_URL) {
    return {
      rules: { userAgent: "*", disallow: "/" },
    };
  }

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [...PRIVATE_APP_PATHS],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
