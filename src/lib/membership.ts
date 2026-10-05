import type { SupabaseClient } from "@supabase/supabase-js";
import type { Role } from "@/types/db";

export type Membership = {
  companyId: string;
  role: Role;
};

// The caller's current company and role, from the memberships table. Null
// means they don't belong to a company yet (mid-onboarding).
//
// This only decides what the app shows and which buttons render. RLS checks
// membership on every row independently, so it is never the security gate.
export async function getActiveMembership(
  supabase: SupabaseClient,
): Promise<Membership | null> {
  const { data } = await supabase
    .rpc("get_active_membership")
    .maybeSingle<{ company_id: string; role: Role }>();

  return data ? { companyId: data.company_id, role: data.role } : null;
}
