import { getAuthUser } from "@/actions/auth";
import AccountShell from "@/components/account/account-shell";
import { createClient } from "@/lib/supabase/server";
import { AccountData } from "@/types/account";
import { Company, Role, User } from "@/types/db";
import { getActiveMembership } from "@/lib/membership";
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
      .select("full_name, created_at, gps_autofile, phone")
      .eq("id", user.id)
      .single<
        Pick<User, "full_name" | "created_at" | "gps_autofile" | "phone">
      >(),
    getActiveMembership(supabase),
  ]);

  if (error || !userInfo) redirect("/sign-in");
  if (!membership) redirect("/onboarding/company");

  // Fetch company details, team members and project count in parallel. The
  // team comes from memberships — a user's role is per company.
  const [{ data: companyInfo }, { data: teamRows }, { count: projectCount }] =
    await Promise.all([
      supabase
        .from("companies")
        .select("name, license_number")
        .eq("id", membership.companyId)
        .single<Pick<Company, "name" | "license_number">>(),
      supabase
        .from("memberships")
        .select("role, user:users!memberships_user_id_fkey(id, full_name)")
        .eq("company_id", membership.companyId)
        .returns<
          {
            role: Role;
            user: Pick<User, "id" | "full_name"> | null;
          }[]
        >(),
      supabase
        .from("projects")
        .select("*", { count: "exact", head: true })
        .eq("company_id", membership.companyId),
    ]);

  if (!companyInfo) redirect("/onboarding/company");

  const team = (teamRows ?? []).flatMap((member) =>
    member.user
      ? [
          {
            id: member.user.id,
            fullName: member.user.full_name ?? "",
            role: member.role,
          },
        ]
      : [],
  );

  const data: AccountData = {
    profile: {
      fullName: userInfo.full_name ?? "",
      role: membership.role,
      email: user.email ?? "",
      createdAt: userInfo.created_at,
      gpsAutofile: userInfo.gps_autofile,
      phone: userInfo.phone,
    },
    company: {
      name: companyInfo.name,
      license_number: companyInfo.license_number,
    },
    counts: {
      members: team.length,
      projects: projectCount ?? 0,
    },
    team,
  };

  return (
    <main>
      <AccountShell data={data} />
    </main>
  );
}

export default AccountPage;
