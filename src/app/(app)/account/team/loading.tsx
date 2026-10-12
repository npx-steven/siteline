import { Button } from "@/components/ui/button";
import { Skeleton, SkeletonScreen } from "@/components/ui/skeleton";
import { IconChevronLeft } from "@tabler/icons-react";
import Link from "next/link";

// Without this, the team page fell back to the account page's skeleton.
export default function TeamLoading() {
  return (
    <SkeletonScreen
      label="Loading team…"
      className="px-4 pb-32 h-dvh overflow-y-auto"
    >
      {/* Back works while loading; the invite button depends on role */}
      <div className="flex flex-row items-center justify-between py-4">
        <Button asChild variant="frosted" size="icon-lg" className="rounded-full">
          <Link href="/account" aria-label="Back to account">
            <IconChevronLeft stroke={1.5} className="size-4" />
          </Link>
        </Button>
        <Skeleton className="size-9 rounded-full" />
      </div>

      <h1 className="text-3xl font-bold tracking-tight mt-2">Team</h1>
      {/* Line box of the text-sm company name; a margin here would collapse
          into the switch's mt-6 below. */}
      <div className="flex h-5 items-center">
        <Skeleton className="h-3.5 w-32" />
      </div>

      {/* Members / Requests switch */}
      <Skeleton className="h-10 w-full rounded-full mt-6" />

      {/* Member rows */}
      <div className="flex flex-col bg-card border border-muted-foreground/20 rounded-3xl px-4 mt-4 divide-y divide-muted-foreground/20">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="flex flex-row items-center justify-between gap-3 py-3"
          >
            <div className="flex flex-row items-center gap-3 min-w-0">
              <Skeleton className="size-10 shrink-0 rounded-full" />
              <div className="flex flex-col">
                <Skeleton className="h-3.5 my-[3px] w-28" />
                <Skeleton className="h-3 my-0.5 w-36" />
              </div>
            </div>
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
        ))}
      </div>
    </SkeletonScreen>
  );
}
