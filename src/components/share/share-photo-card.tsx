"use client";

import Image from "next/image";
import { SharedPhoto } from "@/types/db";
import { formatDayAndTime, formatTime, photoTakenAt } from "@/lib/helpers";

type SharePhotoCardProps = {
  photo: SharedPhoto;
  onOpen: (id: string) => void;
};

function SharePhotoCard({ photo, onOpen }: SharePhotoCardProps) {
  const takenAt = new Date(photoTakenAt(photo));
  return (
    <button
      type="button"
      onClick={() => onOpen(photo.id)}
      aria-label={`Open photo from ${formatDayAndTime(takenAt)}`}
      className="relative block aspect-[4/3] w-full cursor-pointer overflow-hidden rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <Image
        src={photo.url}
        alt=""
        fill
        sizes="(min-width: 768px) 33vw, 100vw"
        className="object-cover"
      />
      <span className="absolute left-2 top-2 rounded-md bg-black/60 px-2 py-0.5 text-xs font-medium text-white">
        {formatTime(takenAt)}
      </span>
    </button>
  );
}

export default SharePhotoCard;
