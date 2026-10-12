import SignOutButton from "@/components/auth/sign-out-button";
import { Separator } from "@/components/ui/separator";
import { Skeleton, SkeletonScreen } from "@/components/ui/skeleton";
import { IconCalendar, IconMail, IconPhone } from "@tabler/icons-react";

// Headings, row labels and Sign out don't depend on the data, so they render
// for real; only the values load.
const CONTACT_ROWS = [
  { icon: IconMail, label: "Email", valueWidth: "w-36" },
  { icon: IconPhone, label: "Phone", valueWidth: "w-24" },
  { icon: IconCalendar, label: "Member since", valueWidth: "w-20" },
];

export default function AccountLoading() {
  return (
    <SkeletonScreen
      label="Loading account…"
      className="px-4 pb-32 h-dvh overflow-y-auto"
    >
      <h1 className="text-3xl font-bold tracking-tight py-6">Account</h1>

      {/* Profile: avatar, name, role · company, Edit */}
      <header className="flex flex-row items-center justify-between">
        <div className="flex flex-row items-center gap-4">
          <Skeleton className="size-16 rounded-full" />
          <div className="flex flex-col">
            <Skeleton className="h-6 my-1 w-40" />
            <Skeleton className="h-3.5 my-[3px] w-44" />
          </div>
        </div>
        <Skeleton className="h-8 w-18 rounded-full" />
      </header>

      {/* Company card */}
      <section className="flex flex-col bg-card border border-muted-foreground/20 rounded-3xl p-4 mt-8">
        <div className="flex flex-row items-start justify-between gap-3">
          <div className="flex flex-1 flex-row items-center gap-3 min-w-0">
            <Skeleton className="size-12 shrink-0 rounded-xl" />
            <div className="flex flex-col">
              <Skeleton className="h-4 my-1 w-36" />
              {/* License line, or the taller "Add license number" pill */}
              <Skeleton className="h-3.5 my-[5px] w-24" />
            </div>
          </div>
          <Skeleton className="size-8 shrink-0 rounded-full" />
        </div>

        <Separator className="my-4" />

        {/* Member avatars + count */}
        <div className="flex flex-row items-center gap-3">
          <div className="flex -space-x-2 shrink-0">
            {[0, 1, 2].map((i) => (
              <Skeleton
                key={i}
                className="size-8 rounded-full ring-2 ring-card"
              />
            ))}
          </div>
          <Skeleton className="h-3.5 w-20" />
        </div>

        {/* Invite / View Team */}
        <div className="flex flex-row gap-2 mt-5">
          <Skeleton className="flex-1 h-12 rounded-full" />
          <Skeleton className="flex-1 h-12 rounded-full" />
        </div>
      </section>

      {/* Contact info */}
      <section className="flex flex-col gap-2 mt-8">
        <h2 className="uppercase text-xs text-muted-foreground">Account</h2>
        <div className="flex flex-col bg-card border border-muted-foreground/20 rounded-3xl px-4 divide-y divide-muted-foreground/20">
          {CONTACT_ROWS.map(({ icon: Icon, label, valueWidth }) => (
            <div
              key={label}
              className="flex flex-row items-center justify-between gap-3 py-3"
            >
              <div className="flex flex-row items-center gap-3 min-w-0">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground">
                  <Icon className="size-4" aria-hidden="true" />
                </div>
                <p className="text-sm font-medium">{label}</p>
              </div>
              <Skeleton className={`h-3.5 ${valueWidth}`} />
            </div>
          ))}
        </div>
      </section>

      <SignOutButton />
    </SkeletonScreen>
  );
}
