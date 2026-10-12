import SignUpForm from "@/components/auth/sign-up-form";
import { OnboardingProgress } from "@/components/onboarding/onboarding-progress";
import { Button } from "@/components/ui/button";
import { IconChevronLeft } from "@tabler/icons-react";
import Link from "next/link";

export default function SignUpPage() {
  return (
    <main className="flex flex-col h-dvh px-6 ">
      {/* Back Button */}
      <div className="py-4">
        <Button
          asChild
          variant="frosted"
          size="icon-lg"
          className="rounded-full"
        >
          <Link href="/">
            <IconChevronLeft stroke={1.5} className="size-4" />
          </Link>
        </Button>
      </div>
      <div>
        <OnboardingProgress step={1} total={2} />
      </div>
      {/* Header */}
      <div className="flex flex-col items-start my-8">
        <h1 className="text-3xl font-semibold tracking-tight">
          Create Your Account
        </h1>
        <p className="text-sm font-normal text-muted-foreground tracking-tight ">
          A few details to get you set up.
        </p>
      </div>
      <div className="flex flex-1 flex-col w-full pb-[max(1rem,env(safe-area-inset-bottom))]">
        <SignUpForm />
        <div className="flex flex-row items-center justify-center pt-4">
          <p className="text-xs font-normal text-muted-foreground">
            Already have an account?
          </p>
          <Button asChild size="xs" variant="link" className="px-1">
            <Link href="/sign-in">Sign In</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
