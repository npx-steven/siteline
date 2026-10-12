import { Button } from "@/components/ui/button";
import { Skeleton, SkeletonScreen } from "@/components/ui/skeleton";
import { IconChevronLeft } from "@tabler/icons-react";
import Link from "next/link";

export default function JoinLoading() {
  return (
    <SkeletonScreen label="Loading invite…" className="flex flex-col h-dvh px-6">
      {/* Back works while loading */}
      <div className="py-4">
        <Button asChild variant="frosted" size="icon-lg" className="rounded-full">
          <Link href="/" aria-label="Back">
            <IconChevronLeft stroke={1.5} className="size-4" />
          </Link>
        </Button>
      </div>

      {/* "Join <company>" + description */}
      <div className="flex flex-col items-start my-8 w-full">
        <Skeleton className="h-7 my-1 w-56" />
        <Skeleton className="h-3.5 my-[3px] w-full" />
        <Skeleton className="h-3.5 my-[3px] w-2/3" />
      </div>

      {/* Primary action */}
      <div className="mt-auto w-full pb-[max(2.5rem,env(safe-area-inset-bottom))]">
        <Skeleton className="h-12 w-full rounded-full" />
      </div>
    </SkeletonScreen>
  );
}
