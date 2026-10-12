import SignInForm from "@/components/auth/sign-in-form";
import { Button } from "@/components/ui/button";

import { IconChevronLeft } from "@tabler/icons-react";
import Link from "next/link";

async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

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
      {/* Header */}
      <div className="flex flex-col items-start my-8">
        <h1 className="text-3xl font-semibold tracking-tight">Welcome Back</h1>
        <p className="text-sm font-normal text-muted-foreground tracking-tight ">
          Enter your details to sign in.
        </p>
      </div>
      <div className="w-full">
        <SignInForm next={next} />
      </div>
      <div className="mt-auto w-full pb-[max(2.5rem,env(safe-area-inset-bottom))]">
        <div className="flex flex-row items-center justify-center">
          <p className="text-xs font-normal text-muted-foreground">
            New to Siteline?
          </p>
          <Button asChild size="xs" variant="link" className="px-1">
            <Link href="/sign-up">Get Started</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}

export default SignInPage;
