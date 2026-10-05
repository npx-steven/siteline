"use client";

import Image from "next/image";
import { Button } from "../ui/button";
import { IconChevronLeft, IconShare2, IconMenu2 } from "@tabler/icons-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

type ProjectHeroProps = {
  coverPhotoUrl: string | null;
  projectId: string;
  disabled: boolean;
  scrolled: boolean;
  // Omitted when the viewer's role can't share — the button isn't rendered.
  onShareClick?: () => void;
};

function ProjectHero({
  coverPhotoUrl,
  projectId,
  disabled,
  scrolled,
  onShareClick,
}: ProjectHeroProps) {
  const backButton = disabled ? (
    <Button variant="frosted" size="icon-lg" className="rounded-full" disabled>
      <IconChevronLeft stroke={1.5} className="size-4" />
    </Button>
  ) : (
    <Link href="/projects">
      <Button variant="frosted" size="icon-lg" className="rounded-full">
        <IconChevronLeft stroke={1.5} className="size-4" />
      </Button>
    </Link>
  );

  const menuButton = disabled ? (
    <Button variant="frosted" size="icon-lg" className="rounded-full" disabled>
      <IconMenu2 stroke={1.5} className="size-4" />
    </Button>
  ) : (
    <Link href={`/projects/${projectId}/settings`}>
      <Button variant="frosted" size="icon-lg" className="rounded-full">
        <IconMenu2 stroke={1.5} className="size-4" />
      </Button>
    </Link>
  );

  const shareButton = onShareClick && (
    <Button
      variant="frosted"
      size="icon-lg"
      className="rounded-full"
      disabled={disabled}
      onClick={onShareClick}
    >
      <IconShare2 stroke={1.5} className="size-4" />
    </Button>
  );

  return (
    <>
      <div
        className={cn(
          "sticky top-0 z-40 flex justify-between p-4 pointer-events-none transition-colors duration-200",
          scrolled && "bg-background/70 backdrop-blur-md",
        )}
      >
        <div className="pointer-events-auto">{backButton}</div>
        <div className="pointer-events-auto flex gap-2">
          {shareButton}
          {menuButton}
        </div>
      </div>
      {coverPhotoUrl ? (
        <div className="relative h-52 w-full -mt-17">
          <Image
            src={coverPhotoUrl}
            alt="Project cover photo"
            fill
            className="object-cover"
            loading="eager"
            priority
          />
          <div className="absolute inset-0 bg-black/20" />
        </div>
      ) : null}
    </>
  );
}

export default ProjectHero;
