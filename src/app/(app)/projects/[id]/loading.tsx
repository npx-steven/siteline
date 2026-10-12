import { Button } from "@/components/ui/button";
import { Skeleton, SkeletonScreen } from "@/components/ui/skeleton";
import { IconChevronLeft, IconMenu2 } from "@tabler/icons-react";
import Link from "next/link";

export default function ProjectLoading() {
  return (
    <SkeletonScreen label="Loading project…" className="h-full overflow-hidden">
      {/* Top bar. Back works while loading; the menu needs the page's data. */}
      <div className="sticky top-0 z-40 flex justify-between p-4">
        <Button asChild variant="frosted" size="icon-lg" className="rounded-full">
          <Link href="/projects" aria-label="Back to projects">
            <IconChevronLeft stroke={1.5} className="size-4" />
          </Link>
        </Button>
        <Button
          variant="frosted"
          size="icon-lg"
          className="rounded-full"
          disabled
          aria-hidden="true"
          tabIndex={-1}
        >
          <IconMenu2 stroke={1.5} className="size-4" />
        </Button>
      </div>

      {/* Cover photo, tucked behind the top bar like the real hero */}
      <Skeleton className="h-52 w-full rounded-none -mt-17" />

      {/* Name + address */}
      <div className="flex flex-col px-4 pt-4">
        <Skeleton className="h-6 my-1 w-2/3" />
        <Skeleton className="h-3.5 my-[3px] w-1/2" />
      </div>

      {/* Photos / Documents switch */}
      <div className="px-4 mt-6" aria-hidden="true">
        <div className="flex w-full rounded-full bg-neutral-200 py-0.5">
          <span className="flex-1 rounded-full py-1.5 text-center text-sm font-medium bg-foreground text-background shadow-xl">
            Photos
          </span>
          <span className="flex-1 rounded-full py-1.5 text-center text-sm font-medium text-muted-foreground">
            Documents
          </span>
        </div>
      </div>

      {/* Count + select / add buttons */}
      <div className="w-full py-4 px-4">
        <div className="flex flex-row items-center justify-between h-10">
          <Skeleton className="h-3.5 w-20" />
          <div className="flex flex-row gap-2">
            <Skeleton className="size-8 rounded-full" />
            <Skeleton className="size-8 rounded-full" />
          </div>
        </div>
      </div>

      {/* Day header + photo grid */}
      <div className="px-4">
        <Skeleton className="h-3.5 my-[11px] w-24" />
        <div className="grid grid-cols-4 gap-2">
          {Array.from({ length: 16 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square w-full rounded-md" />
          ))}
        </div>
      </div>
    </SkeletonScreen>
  );
}
