import { Skeleton, SkeletonScreen } from "@/components/ui/skeleton";
import { IconLock } from "@tabler/icons-react";
import Image from "next/image";

// The first thing a client sees from a share link, so the fixed parts —
// "Secure Client Link", the Siteline mark, the view switch — render for real.
export default function ShareLoading() {
  return (
    <SkeletonScreen label="Loading shared photos…">
      {/* Company + secure-link bar */}
      <div className="flex flex-row items-center justify-between p-4">
        <div className="flex flex-row items-center gap-2">
          <Skeleton className="size-10 rounded-lg" />
          <div className="flex flex-col items-start">
            <Skeleton className="h-3.5 my-0.5 w-28" />
            <div className="flex flex-row items-center gap-1 text-muted-foreground leading-tight">
              <IconLock stroke={2} height={12} width={12} aria-hidden="true" />
              <span className="text-[11px]">Secure Client Link</span>
            </div>
          </div>
        </div>
        <div className="overflow-hidden rounded-sm w-6 h-6">
          <Image
            src="/icons/siteline-icon-1024.png"
            width={32}
            height={32}
            alt=""
            className="object-cover w-full h-full"
          />
        </div>
      </div>

      {/* Photo count, project name, address, date range + Download All */}
      <div className="flex flex-col gap-2 p-4">
        <Skeleton className="h-3 my-[2px] w-40" />
        <Skeleton className="h-7 my-1 md:h-8 w-3/4" />
        <Skeleton className="h-3.5 my-[3px] w-56" />
        <div className="flex flex-row items-center justify-between h-8">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>

      {/* Gallery / Timeline switch */}
      <div className="px-4" aria-hidden="true">
        <div className="flex w-full rounded-full bg-neutral-200 py-0.5">
          <span className="flex-1 rounded-full py-1.5 text-center text-sm font-medium bg-foreground text-background shadow-xl">
            Gallery
          </span>
          <span className="flex-1 rounded-full py-1.5 text-center text-sm font-medium text-muted-foreground">
            Timeline
          </span>
        </div>
      </div>

      {/* Day header + photo grid */}
      <div className="px-4 py-6">
        <div className="mb-4 flex items-center gap-2">
          <Skeleton className="h-5 my-1 w-32" />
          <div className="ml-2 h-px flex-1 bg-border" />
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[4/3] w-full rounded-xl" />
          ))}
        </div>
      </div>
    </SkeletonScreen>
  );
}
