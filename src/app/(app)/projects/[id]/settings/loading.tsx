import { Skeleton } from "@/components/ui/skeleton";

export default function ProjectSettingsLoading() {
  return (
    <div
      className="text-foreground flex flex-col"
      aria-busy="true"
      aria-live="polite"
    >
      {/* Top bar with back button + centered title */}
      <div className="relative flex items-center p-4">
        <Skeleton className="size-10 rounded-full" />
        <span className="absolute inset-x-0 mx-auto flex justify-center">
          <Skeleton className="h-3 w-28" />
        </span>
      </div>

      {/* Project name + address */}
      <div className="flex flex-col items-center gap-2 p-4">
        <Skeleton className="h-7 w-2/3" />
        <Skeleton className="h-4 w-1/2" />
      </div>

      {/* Action tiles (Edit / Star / Share) */}
      <div className="flex flex-row items-center justify-center gap-6 p-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex flex-col items-center gap-1.5">
            <Skeleton className="size-11 rounded-xl" />
            <Skeleton className="h-3 w-10" />
          </div>
        ))}
      </div>

      {/* Directions button */}
      <div className="px-4">
        <Skeleton className="h-12 w-full rounded-2xl" />
      </div>

      {/* Stats card */}
      <div className="p-4">
        <div className="bg-card border border-border w-full rounded-2xl flex flex-col divide-y divide-border px-4">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="flex flex-row items-center justify-between py-3"
            >
              <div className="flex flex-row gap-2 items-center">
                <Skeleton className="size-5 rounded-sm" />
                <Skeleton className="h-4 w-20" />
              </div>
              <Skeleton className="h-3 w-16" />
            </div>
          ))}
        </div>
      </div>

      {/* Danger zone */}
      <div className="mt-6 px-4">
        <Skeleton className="h-12 w-full rounded-2xl" />
      </div>

      <span className="sr-only">Loading project settings…</span>
    </div>
  );
}
