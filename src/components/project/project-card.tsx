"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import {
  IconStar,
  IconStarFilled,
  IconPolaroidFilled,
} from "@tabler/icons-react";
import { toggleProjectStarredAction } from "@/actions/projects";
import { haversineDistance } from "@/lib/helpers";
import type { Coordinates } from "@/types/location";

type ProjectCardProps = {
  id: string;
  name: string;
  address: string;
  isStarred: boolean;
  thumbnailUrl: string | null;
  projectLat: number | null;
  projectLng: number | null;
  userCoords: Coordinates | null;
  priority?: boolean;
};

export function ProjectCard({
  id,
  name,
  address,
  isStarred,
  thumbnailUrl,
  projectLat,
  projectLng,
  userCoords,
  priority = false,
}: ProjectCardProps) {
  const [starred, setStarred] = useState(isStarred);
  const [isPending, setIsPending] = useState(false);

  async function handleStarClick(e: React.MouseEvent<HTMLButtonElement>) {
    e.preventDefault();
    e.stopPropagation();
    const flip = !starred;
    setStarred(flip);
    setIsPending(true);
    try {
      await toggleProjectStarredAction(id, flip);
    } catch {
      setStarred(!flip);
    } finally {
      setIsPending(false);
    }
  }

  const distance =
    userCoords && projectLat && projectLng
      ? `${haversineDistance(userCoords.lat, userCoords.lng, projectLat, projectLng).toFixed(1)} mi`
      : null;

  return (
    <Link
      href={`/projects/${id}`}
      className="relative block aspect-2/1 rounded-xl border overflow-hidden"
    >
      {/* Background image or placeholder */}
      {thumbnailUrl ? (
        <Image
          src={thumbnailUrl}
          alt={name}
          fill
          sizes="100vw"
          className="object-cover"
          loading="eager"
          priority={priority}
        />
      ) : (
        <div className="absolute inset-0 bg-muted flex items-center justify-center">
          <IconPolaroidFilled
            size={48}
            stroke={1.5}
            className="text-muted-foreground/30"
          />
        </div>
      )}

      {/* Gradient scrim */}
      <div
        className={`absolute inset-0 bg-linear-to-t ${
          thumbnailUrl
            ? "from-black/70 via-black/10 to-transparent"
            : "from-black/40 via-black/10 to-transparent"
        }`}
      />

      {/* Star button */}
      <button
        onClick={handleStarClick}
        disabled={isPending}
        aria-label={starred ? "Unstar project" : "Star project"}
        className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center shadow-sm"
      >
        {starred ? (
          <IconStarFilled size={18} className="text-amber-400" />
        ) : (
          <IconStar size={18} className="text-foreground" />
        )}
      </button>

      {/* Info overlay */}
      <div className="absolute bottom-0 left-0 right-0 p-4 space-y-1">
        <h3 className="font-semibold text-white text-sm">{name}</h3>
        <div className="flex flex-row justify-between items-center gap-1 text-xs text-white/80">
          <span>{address}</span>
          {distance && <span>{distance}</span>}
        </div>
      </div>
    </Link>
  );
}
