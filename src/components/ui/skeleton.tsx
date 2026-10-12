import { cn } from "@/lib/utils";

// A placeholder block. Its color and left-to-right sweep live in globals.css
// under [data-slot="skeleton"]. Hidden from assistive tech: the surrounding
// SkeletonScreen announces the loading state once instead.
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      aria-hidden="true"
      className={cn("rounded-md", className)}
      {...props}
    />
  );
}

// Wraps a route's loading UI. role="status" with aria-busy tells screen
// readers the region is loading, and the label gives them something to say
// in place of the shapes.
function SkeletonScreen({
  label,
  className,
  children,
  ...props
}: React.ComponentProps<"div"> & { label: string }) {
  return (
    <div role="status" aria-busy="true" className={className} {...props}>
      {children}
      <span className="sr-only">{label}</span>
    </div>
  );
}

export { Skeleton, SkeletonScreen };
