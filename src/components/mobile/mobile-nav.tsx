"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IconFolderOpen,
  IconFolderOpenFilled,
  IconCamera,
  IconUser,
  IconUserFilled,
  IconPlus,
} from "@tabler/icons-react";

interface MobileNavProps {
  onAddProject?: () => void;
  onCameraCapture: (file: File) => void;
  onCameraButtonPress?: () => void;
}

export default function MobileNav({
  onAddProject,
  onCameraCapture,
  onCameraButtonPress,
}: MobileNavProps) {
  const pathname = usePathname();
  const isOnProjects = pathname === "/projects";

  const openCamera = () => {
    onCameraButtonPress?.();
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.capture = "environment";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) onCameraCapture(file); // was: console.log("photo captured:", file.name)
    };
    input.click();
  };

  return (
    <nav className="fixed bottom-8 left-4 right-4 z-50 max-w-xs mx-auto">
      <div className="flex items-center justify-around bg-card border border-border rounded-full px-6 py-3 shadow-sm">
        {/* Left slot — Add Project on /projects, Projects link elsewhere */}
        {isOnProjects ? (
          <button
            onClick={onAddProject}
            className="flex flex-col items-center gap-1 min-w-16"
            aria-label="Add project"
          >
            <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center">
              <IconPlus size={24} className="text-foreground" />
            </div>
          </button>
        ) : (
          <Link
            href="/projects"
            className="flex flex-col items-center gap-1 min-w-16"
          >
            {pathname.startsWith("/projects") ? (
              <IconFolderOpenFilled size={24} className="text-foreground" />
            ) : (
              <IconFolderOpen size={24} className="text-muted-foreground" />
            )}
            <span
              className={`text-xs font-medium ${
                pathname.startsWith("/projects")
                  ? "text-foreground"
                  : "text-muted-foreground"
              }`}
            >
              Projects
            </span>
          </Link>
        )}

        {/* Camera FAB */}
        <button
          onClick={openCamera}
          className="flex flex-col items-center gap-1 min-w-16"
          aria-label="Open camera"
        >
          <div className="w-14 h-14 rounded-full bg-foreground flex items-center justify-center">
            <IconCamera size={24} className="text-background" />
          </div>
        </button>

        {/* Account tab */}
        <Link
          href="/account"
          className="flex flex-col items-center gap-1 min-w-16"
        >
          {pathname.startsWith("/account") ? (
            <IconUserFilled size={24} className="text-foreground" />
          ) : (
            <IconUser size={24} className="text-muted-foreground" />
          )}
          <span
            className={`text-xs font-medium ${
              pathname.startsWith("/account")
                ? "text-foreground"
                : "text-muted-foreground"
            }`}
          >
            Account
          </span>
        </Link>
      </div>
    </nav>
  );
}
