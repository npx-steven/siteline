import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "192.168.1.164",
    "surfboard-yearly-overlook.ngrok-free.dev",
  ],
  experimental: {
    serverActions: {
      // Vercel caps a serverless function's request body at 4.5 MB, and Server
      // Actions ride that request — anything higher here is not honored in
      // production. Files are guarded client-side at MAX_UPLOAD_BYTES (4 MB),
      // leaving headroom for the multipart envelope.
      bodySizeLimit: "4.5mb",
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "nljpnnjzmexnculksjnw.supabase.co",
      },
    ],
  },
  async headers() {
    // Private or form-only pages that must never appear in search results.
    // A header (not robots.txt) so it works even if the URL is linked
    // externally, e.g. a share link pasted into a public page.
    const noindex = [{ key: "X-Robots-Tag", value: "noindex, nofollow" }];

    return [
      { source: "/share/:path*", headers: noindex },
      { source: "/join/:path*", headers: noindex },
      { source: "/sign-in", headers: noindex },
      { source: "/sign-up", headers: noindex },
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Content-Security-Policy",
            value: "frame-ancestors 'self';",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
