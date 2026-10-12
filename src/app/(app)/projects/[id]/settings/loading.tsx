import { Skeleton, SkeletonScreen } from "@/components/ui/skeleton";
import {
  IconCalendar,
  IconFileText,
  IconPhoto,
} from "@tabler/icons-react";

// Labels are fixed, so they render for real; only the values load.
const STATS = [
  { icon: IconPhoto, label: "Photos" },
  { icon: IconFileText, label: "Documents" },
  { icon: IconCalendar, label: "Created" },
];

export default function ProjectSettingsLoading() {
  return (
    <SkeletonScreen
      label="Loading project settings…"
      className="text-foreground flex flex-col"
    >
      {/* Top bar: back button + title */}
      <div className="relative flex items-center p-4">
        <Skeleton className="size-9 rounded-full" />
        <span className="absolute inset-x-0 text-center text-xs font-medium">
          Project Settings
        </span>
      </div>

      {/* Project name + address */}
      <div className="flex flex-col items-center p-4">
        <Skeleton className="h-6 my-1 w-2/3" />
        <Skeleton className="h-3.5 my-[3px] w-1/2" />
      </div>

      {/* Action tiles (Edit / Star / Share) */}
      <div className="flex flex-row items-center justify-center gap-6 p-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex flex-col items-center gap-1.5">
            <Skeleton className="size-11 rounded-xl" />
            <Skeleton className="h-3 my-0.5 w-10" />
          </div>
        ))}
      </div>

      {/* Get Directions */}
      <div className="px-4 py-2">
        <Skeleton className="h-12 w-full rounded-full mt-6" />
      </div>

      {/* Stats */}
      <div className="p-4">
        <div className="bg-card border border-border w-full rounded-2xl flex flex-col divide-y divide-border px-4">
          {STATS.map(({ icon: Icon, label }) => (
            <div
              key={label}
              className="flex flex-row items-center justify-between py-3"
            >
              <div className="flex flex-row gap-2 items-center">
                <Icon
                  stroke={1.5}
                  size={18}
                  className="text-muted-foreground"
                  aria-hidden="true"
                />
                <span className="text-sm font-medium">{label}</span>
              </div>
              <Skeleton className="h-3 w-16" />
            </div>
          ))}
        </div>
      </div>
    </SkeletonScreen>
  );
}
