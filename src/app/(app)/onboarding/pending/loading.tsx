import { Skeleton, SkeletonScreen } from "@/components/ui/skeleton";

export default function PendingLoading() {
  return (
    <SkeletonScreen
      label="Loading your request…"
      className="flex flex-col h-dvh px-6 pt-6 pb-[max(1rem,env(safe-area-inset-bottom))]"
    >
      {/* Status icon tile */}
      <Skeleton className="size-14 rounded-2xl" />

      {/* Title + explanation */}
      <div className="mt-6 flex flex-col">
        <Skeleton className="h-7 my-1 w-64" />
        <Skeleton className="h-3.5 my-[3px] w-full" />
        <Skeleton className="h-3.5 my-[3px] w-3/4" />
      </div>

      {/* Requested at */}
      <div className="mt-6 flex h-4 items-center">
        <Skeleton className="h-3 w-36" />
      </div>

      {/* Check Status / Cancel Request / Start my own company */}
      <div className="mt-auto flex flex-col items-center gap-2">
        <Skeleton className="h-12 w-full rounded-full" />
        <Skeleton className="h-4 my-2.5 w-28" />
        <Skeleton className="h-3 my-2 w-44" />
      </div>
    </SkeletonScreen>
  );
}
