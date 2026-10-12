import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";

export default function AccountLoading() {
  return (
    <div
      className="px-4 pb-32 h-dvh overflow-y-auto"
      aria-busy="true"
      aria-live="polite"
    >
      <h1 className="text-3xl font-bold tracking-tight py-6">Account</h1>

      {/* AccountHeader skeleton */}
      <header className="flex flex-row items-center justify-between">
        <div className="flex flex-row items-center gap-4">
          <Skeleton className="size-16 rounded-full" />
          <div className="flex flex-col gap-2">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-52" />
          </div>
        </div>
        <Skeleton className="h-9 w-20 rounded-full" />
      </header>

      {/* CompanyCard skeleton */}
      <section className="flex flex-col bg-card border border-muted-foreground/20 rounded-3xl p-4 mt-8">
        <div className="flex flex-row items-start justify-between gap-3">
          <div className="flex flex-1 flex-row items-center gap-3 min-w-0">
            <Skeleton className="size-12 rounded-xl" />
            <div className="flex flex-col gap-2">
              <Skeleton className="h-5 w-36" />
              <Skeleton className="h-4 w-28" />
            </div>
          </div>
          <Skeleton className="size-9 rounded-full" />
        </div>
        <Separator className="my-4" />
        <div className="flex flex-row items-stretch">
          <div className="flex-1 flex flex-col gap-2">
            <Skeleton className="h-7 w-10" />
            <Skeleton className="h-3 w-16" />
          </div>
          <Separator orientation="vertical" className="mx-4" />
          <div className="flex-1 flex flex-col gap-2">
            <Skeleton className="h-7 w-10" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
        <Skeleton className="h-12 w-full rounded-full mt-6" />
      </section>

      {/* ContactInfo skeleton */}
      <section className="flex flex-col gap-2 mt-8">
        <Skeleton className="h-3 w-16" />
        <div className="flex flex-col bg-card border border-muted-foreground/20 rounded-3xl px-4 divide-y divide-muted-foreground/20">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="flex flex-row items-center justify-between gap-3 py-3"
            >
              <div className="flex flex-row items-center gap-3 min-w-0">
                <Skeleton className="size-8 rounded-lg" />
                <Skeleton className="h-4 w-20" />
              </div>
              <Skeleton className="h-4 w-32" />
            </div>
          ))}
        </div>
      </section>

      {/* Sign out button skeleton */}
      <div className="mt-8">
        <Skeleton className="h-10 w-28 rounded-full" />
      </div>

      <span className="sr-only">Loading account…</span>
    </div>
  );
}
