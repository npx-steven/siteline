import { getAuthUser } from "@/actions/auth";
import TeamView from "@/components/account/team-view";
import { getActiveMembership } from "@/lib/membership";
import { can } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { loadJoinRequests, loadTeamMembers } from "@/lib/team";
import { Company } from "@/types/db";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

type TeamPageProps = {
  searchParams: Promise<{ tab?: string }>;
};

async function TeamPage({ searchParams }: TeamPageProps) {
  const { tab } = await searchParams;
  const supabase = createClient(await cookies());

  const user = await getAuthUser();
  if (!user) redirect("/");

  const membership = await getActiveMembership(supabase);
  if (!membership) redirect("/onboarding/company");

  // Every member sees the team; owners and managers see and act on requests.
  const canManageRequests = can.manageInvites(membership.role);

  const [{ data: company }, members, requests] = await Promise.all([
    supabase
      .from("companies")
      .select("name")
      .eq("id", membership.companyId)
      .single<Pick<Company, "name">>(),
    loadTeamMembers(supabase, user.id),
    canManageRequests ? loadJoinRequests(supabase) : Promise.resolve([]),
  ]);

  return (
    <TeamView
      companyName={company?.name ?? ""}
      members={members}
      requests={requests}
      canManageRequests={canManageRequests}
      canManageMembers={can.manageMembers(membership.role)}
      initialTab={canManageRequests && tab === "requests" ? "requests" : "members"}
    />
  );
}

export default TeamPage;
