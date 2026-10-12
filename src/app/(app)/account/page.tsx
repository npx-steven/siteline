import { getAuthUser } from "@/lib/auth";
import AccountShell from "@/components/account/account-shell";
import { getActiveMembership } from "@/lib/membership";
import { can } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { loadJoinRequests, loadTeamMembers } from "@/lib/team";
import { AccountData } from "@/types/account";
import { Company, User } from "@/types/db";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

async function AccountPage() {
  const cookieStore = await cookies();
  const supabase = await createClient(cookieStore);

  const user = await getAuthUser();
  if (!user) redirect("/");

  // Fetch profile details and the active company membership in parallel
  const [{ data: userInfo, error }, membership] = await Promise.all([
    supabase
      .from("users")
      .select("full_name, created_at, phone")
      .eq("id", user.id)
      .single<Pick<User, "full_name" | "created_at" | "phone">>(),
    getActiveMembership(supabase),
  ]);

  if (error || !userInfo) redirect("/sign-in");
  if (!membership) redirect("/onboarding/company");

  const [{ data: companyInfo }, team, requests] = await Promise.all([
    supabase
      .from("companies")
      .select("name, license_number")
      .eq("id", membership.companyId)
      .single<Pick<Company, "name" | "license_number">>(),
    loadTeamMembers(supabase, user.id),
    can.manageInvites(membership.role)
      ? loadJoinRequests(supabase)
      : Promise.resolve([]),
  ]);

  if (!companyInfo) redirect("/onboarding/company");

  const data: AccountData = {
    profile: {
      fullName: userInfo.full_name ?? "",
      role: membership.role,
      email: user.email ?? "",
      createdAt: userInfo.created_at,
      phone: userInfo.phone,
    },
    company: {
      name: companyInfo.name,
      license_number: companyInfo.license_number,
    },
    members: {
      count: team.length,
      names: team.map((member) => member.fullName),
    },
    requestCount: requests.length,
  };

  return <AccountShell data={data} />;
}

export default AccountPage;
