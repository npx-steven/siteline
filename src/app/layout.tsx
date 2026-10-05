import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const geist = Geist({
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Siteline",
  description: "Organize job site photos and documents by job.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Siteline",
  },
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icons/favicon.ico", sizes: "any" },
      { url: "/icons/favicon-16.png", sizes: "16x16", type: "image/png" },
      { url: "/icons/siteline-icon-32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: { url: "/icons/siteline-icon-180.png", sizes: "180x180" },
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
  userScalable: false,
  themeColor: "#FFFFFF",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={geist.className}>
      <body className="bg-background text-foreground antialiased">
        {children}
        <Toaster position="top-center" />
      </body>
    </html>
  );
}
