import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  IconArrowRight,
  IconCamera,
  IconCheck,
  IconFileText,
  IconMapPin,
  IconUpload,
} from "@tabler/icons-react";
import Link from "next/link";

const features = [
  {
    icon: IconMapPin,
    title: "Auto-filed by GPS",
    description: "Every photo lands in the right project automatically.",
  },
  {
    icon: IconCamera,
    title: "Capture on site",
    description: "Snap progress photos and they log the moment you shoot.",
  },
  {
    icon: IconFileText,
    title: "Photos and docs together",
    description: "Keep plans, permits, and pictures in one place.",
  },
  {
    icon: IconUpload,
    title: "Share with your client",
    description: "Send a gallery or a timeline of photos in a single tap.",
  },
];

function OnboardingWelcomePage() {
  return (
    <div className="flex flex-col h-dvh px-6 pt-6 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <Badge className="rounded-full bg-foreground text-background gap-1.5 px-3 py-1 h-auto">
        <IconCheck stroke={2} className="size-3.5" />
        You&apos;re all set
      </Badge>

      <div className="mt-4 flex flex-col gap-1">
        <h1 className="text-3xl font-semibold tracking-tight">
          Welcome to Siteline
        </h1>
        <p className="text-sm text-muted-foreground tracking-tight">
          Here&apos;s everything you can do from the job site.
        </p>
      </div>

      <ul className="mt-8 flex flex-col gap-6">
        {features.map(({ icon: Icon, title, description }) => (
          <li key={title} className="flex flex-row items-start gap-4">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-white border border-border">
              <Icon stroke={2} className="size-5" />
            </div>
            <div className="flex flex-col gap-1 pt-0.5">
              <h2 className="text-base font-semibold tracking-tight leading-tight">
                {title}
              </h2>
              <p className="text-sm text-muted-foreground tracking-tight leading-snug">
                {description}
              </p>
            </div>
          </li>
        ))}
      </ul>

      <Button
        asChild
        size="lg"
        className="mt-auto w-full rounded-full text-base py-6"
      >
        <Link href="/projects">
          Go to Projects
          <IconArrowRight stroke={2} />
        </Link>
      </Button>
    </div>
  );
}

export default OnboardingWelcomePage;
