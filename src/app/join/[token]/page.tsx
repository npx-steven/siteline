import { getAuthUser } from "@/actions/auth";
import SignUpForm from "@/components/auth/sign-up-form";
import RequestJoinButton from "@/components/onboarding/request-join-button";
import { Button } from "@/components/ui/button";
import { getActiveMembership } from "@/lib/membership";
import { createClient } from "@/lib/supabase/server";
import { IconChevronLeft } from "@tabler/icons-react";
import { cookies } from "next/headers";
import Link from "next/link";

type JoinProps = {
  params: Promise<{ token: string }>;
};

function JoinLayout({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
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
        <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
        <p className="text-sm font-normal text-muted-foreground tracking-tight ">
          {description}
        </p>
      </div>
      {children}
    </main>
  );
}

async function JoinPage({ params }: JoinProps) {
  const { token } = await params;
  const supabase = createClient(await cookies());

  // Join links and companies aren't readable directly — this resolves only a
  // live (unrevoked, unexpired) link.
  const { data: link } = await supabase
    .rpc("get_join_link_info", { link_token: token })
    .maybeSingle<{ company_name: string }>();

  if (!link) {
    return (
      <JoinLayout
        title="Link Not Available"
        description="This join link has expired or was reset. Ask your team for a new one."
      >
        <div className="mt-auto w-full pb-[max(2.5rem,env(safe-area-inset-bottom))]">
          <Button
            asChild
            className="w-full rounded-full text-base py-6"
            size="lg"
          >
            <Link href="/sign-in">Sign In</Link>
          </Button>
        </div>
      </JoinLayout>
    );
  }

  const companyName = link.company_name;
  const user = await getAuthUser();

  // Signed out: create an account, which sends the request right after.
  if (!user) {
    return (
      <JoinLayout
        title={`Join ${companyName}`}
        description="Create an account to request access. An owner or manager approves each new teammate."
      >
        <div className="flex flex-1 flex-col w-full pb-[max(1rem,env(safe-area-inset-bottom))]">
          <SignUpForm token={token} />
          <div className="flex flex-row items-center justify-center pt-4">
            <p className="text-xs font-normal text-muted-foreground">
              Already have an account?
            </p>
            <Button asChild size="xs" variant="link" className="px-1">
              <Link href={`/sign-in?next=${encodeURIComponent(`/join/${token}`)}`}>
                Sign In
              </Link>
            </Button>
          </div>
        </div>
      </JoinLayout>
    );
  }

  // Signed in and already on a team: one company per person until the app has
  // a company switcher.
  if (await getActiveMembership(supabase)) {
    return (
      <JoinLayout
        title="You're Already on a Team"
        description={`You can't join ${companyName} while you belong to another company.`}
      >
        <div className="mt-auto w-full pb-[max(2.5rem,env(safe-area-inset-bottom))]">
          <Button
            asChild
            className="w-full rounded-full text-base py-6"
            size="lg"
          >
            <Link href="/projects">Go to Projects</Link>
          </Button>
        </div>
      </JoinLayout>
    );
  }

  // Signed in without a company: one tap to request.
  return (
    <JoinLayout
      title={`Join ${companyName}`}
      description="Send a request to join. You'll get access as soon as an owner or manager approves you."
    >
      <div className="mt-auto w-full pb-[max(2.5rem,env(safe-area-inset-bottom))]">
        <RequestJoinButton token={token} />
      </div>
    </JoinLayout>
  );
}

export default JoinPage;
