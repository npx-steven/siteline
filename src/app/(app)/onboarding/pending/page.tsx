import PendingRequestActions from "@/components/onboarding/pending-request-actions";
import { createClient } from "@/lib/supabase/server";
import { IconClock, IconX } from "@tabler/icons-react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

type MyJoinRequest = {
  request_status: "pending" | "declined" | "expired";
  company_name: string;
  requested_at: string;
};

function formatRequestedAt(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

async function OnboardingPendingPage() {
  const supabase = createClient(await cookies());
  const { data: request } = await supabase
    .rpc("get_my_join_request")
    .maybeSingle<MyJoinRequest>();

  if (!request) redirect("/onboarding/company");

  const declined = request.request_status === "declined";
  const expired = request.request_status === "expired";
  // Declined and expired both end the request; only the wording differs.
  const closed = declined || expired;

  return (
    <main className="flex flex-col h-dvh px-6 pt-6 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <div className="flex size-14 items-center justify-center rounded-2xl border border-border bg-card">
        {closed ? (
          <IconX stroke={1.5} className="size-7" />
        ) : (
          <IconClock stroke={1.5} className="size-7" />
        )}
      </div>

      <div className="mt-6 flex flex-col gap-1">
        <h1 className="text-3xl font-semibold tracking-tight">
          {declined
            ? "Request Not Approved"
            : expired
              ? "Request Expired"
              : "Waiting for Approval"}
        </h1>
        <p className="text-sm text-muted-foreground tracking-tight text-pretty">
          {declined ? (
            <>
              <span className="font-semibold text-foreground">
                {request.company_name}
              </span>{" "}
              didn&apos;t approve your request. Ask them for a new link, or
              start your own company.
            </>
          ) : expired ? (
            <>
              Your request to join{" "}
              <span className="font-semibold text-foreground">
                {request.company_name}
              </span>{" "}
              wasn&apos;t answered within 14 days. Open their link again to send
              a new request, or start your own company.
            </>
          ) : (
            <>
              You asked to join{" "}
              <span className="font-semibold text-foreground">
                {request.company_name}
              </span>
              . You&apos;ll get access as soon as an owner or manager
              approves you.
            </>
          )}
        </p>
      </div>

      {!closed && (
        <p className="mt-6 text-xs text-muted-foreground">
          Requested {formatRequestedAt(request.requested_at)}
        </p>
      )}

      <PendingRequestActions closed={closed} />
    </main>
  );
}

export default OnboardingPendingPage;
