import { Skeleton, SkeletonScreen } from "@/components/ui/skeleton";

// The filter chips are fixed UI, so they render for real rather than as
// placeholders; only data-driven parts become skeletons.
const FILTER_LABELS = ["All", "Nearby", "Recent", "Starred"];

export default function ProjectsLoading() {
  return (
    <SkeletonScreen label="Loading projects…" className="h-full flex flex-col">
      <div className="flex flex-col gap-3 pt-6 pb-2 bg-background">
        {/* Greeting + project count */}
        <div className="flex flex-col px-4">
          <Skeleton className="h-6 my-1 w-48" />
          <Skeleton className="h-3.5 my-[3px] w-24" />
        </div>

        {/* Search */}
        <div className="px-4">
          <Skeleton className="h-12 w-full rounded-full" />
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 overflow-hidden px-4" aria-hidden="true">
          {FILTER_LABELS.map((label, i) => (
            <span
              key={label}
              className={
                i === 0
                  ? "shrink-0 px-3.5 py-1.5 rounded-full text-sm font-medium bg-foreground text-background"
                  : "shrink-0 px-3.5 py-1.5 rounded-full text-sm font-medium bg-card border border-border text-muted-foreground"
              }
            >
              {label}
            </span>
          ))}
        </div>
      </div>

      {/* Project cards — enough to fill a phone screen */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <div className="p-4 flex flex-col gap-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="aspect-2/1 w-full rounded-xl" />
          ))}
        </div>
      </div>
    </SkeletonScreen>
  );
}
