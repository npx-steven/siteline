import ForgotPasswordForm from "@/components/auth/forgot-password-form";
import { Button } from "@/components/ui/button";
import { IconChevronLeft } from "@tabler/icons-react";
import Link from "next/link";

async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ expired?: string }>;
}) {
  // Set by /auth/confirm and the proxy when a reset link didn't work.
  const { expired } = await searchParams;

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
          <Link href="/sign-in">
            <IconChevronLeft stroke={1.5} className="size-4" />
          </Link>
        </Button>
      </div>
      {/* Header */}
      <div className="flex flex-col items-start my-8">
        <h1 className="text-3xl font-semibold tracking-tight">
          Reset Your Password
        </h1>
        <p className="text-sm font-normal text-muted-foreground tracking-tight ">
          We&apos;ll email you a link to choose a new one.
        </p>
      </div>
      {expired && (
        <p className="mb-6 rounded-xl border border-border bg-card p-4 text-sm text-pretty">
          That reset link has expired or was already used. Request a new one
          below.
        </p>
      )}
      <div className="w-full">
        <ForgotPasswordForm />
      </div>
      <div className="mt-auto w-full pb-[max(2.5rem,env(safe-area-inset-bottom))]">
        <div className="flex flex-row items-center justify-center">
          <p className="text-xs font-normal text-muted-foreground">
            Remembered it?
          </p>
          <Button asChild size="xs" variant="link" className="px-1">
            <Link href="/sign-in">Sign In</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}

export default ForgotPasswordPage;
