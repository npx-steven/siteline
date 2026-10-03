import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Siteline",
    short_name: "Siteline",
    description: "Organize job site photos and documents by job.",
    start_url: "/",
    display: "standalone",
    background_color: "#FFFFFF",
    theme_color: "#FFFFFF",
    orientation: "portrait",
    icons: [
      {
        src: "/icons/siteline-icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icons/siteline-icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
