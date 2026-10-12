"use client";

import { cancelJoinRequestAction } from "@/actions/join";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

// closed: the request was declined or expired, so there's nothing to wait on.
function PendingRequestActions({ closed }: { closed: boolean }) {
  const router = useRouter();
  const [isCancelling, setIsCancelling] = useState(false);

  async function handleCancel() {
    setIsCancelling(true);
    const { error } = await cancelJoinRequestAction();
    if (error) {
      toast.error(error);
      setIsCancelling(false);
      return;
    }
    router.push("/onboarding/company");
  }

  if (closed) {
    return (
      <div className="mt-auto flex flex-col gap-2">
        <Button asChild size="lg" className="w-full rounded-full text-base py-6">
          <Link href="/onboarding/company">Start My Own Company</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mt-auto flex flex-col gap-2">
      {/* The welcome screen is only reachable once they're a member — the
          proxy sends anyone still waiting straight back here. */}
      <Button asChild size="lg" className="w-full rounded-full text-base py-6">
        <Link href="/onboarding/welcome">Check Status</Link>
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="lg"
        onClick={handleCancel}
        disabled={isCancelling}
        className="w-full rounded-full text-base"
      >
        {isCancelling ? "Cancelling..." : "Cancel Request"}
      </Button>
      <Button asChild variant="link" size="sm" className="text-muted-foreground">
        <Link href="/onboarding/company">Start my own company instead</Link>
      </Button>
    </div>
  );
}

export default PendingRequestActions;
