import ResetPasswordForm from "@/components/auth/reset-password-form";

// Only reachable with the session a reset link creates — the proxy sends
// everyone else to /forgot-password.
export default function ResetPasswordPage() {
  return (
    <main className="flex flex-col h-dvh px-6 ">
      <div className="py-4" aria-hidden>
        <div className="size-9" />
      </div>
      {/* Header */}
      <div className="flex flex-col items-start my-8">
        <h1 className="text-3xl font-semibold tracking-tight">
          Choose a New Password
        </h1>
        <p className="text-sm font-normal text-muted-foreground tracking-tight ">
          You&apos;ll be signed out on your other devices.
        </p>
      </div>
      <div className="flex flex-1 flex-col w-full pb-[max(1rem,env(safe-area-inset-bottom))]">
        <ResetPasswordForm />
      </div>
    </main>
  );
}
