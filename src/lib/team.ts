import type { SupabaseClient } from "@supabase/supabase-js";
import type { GrantableRole } from "@/lib/roles";
import type { JoinRequest, TeamMember } from "@/types/account";
import type { Role } from "@/types/db";

// Teammates and their emails live partly in auth.users, which clients can't
// read, so both lists come from RPCs scoped to the caller's active company.

type TeamMemberRow = {
  user_id: string;
  full_name: string | null;
  email: string;
  phone: string | null;
  role: Role;
  joined_at: string;
};

type JoinRequestRow = {
  request_id: string;
  full_name: string | null;
  email: string;
  requested_role: GrantableRole;
  requested_at: string;
};

export async function loadTeamMembers(
  supabase: SupabaseClient,
  userId: string,
): Promise<TeamMember[]> {
  const { data } = await supabase.rpc("list_team_members");

  return ((data ?? []) as TeamMemberRow[]).map((row) => ({
    id: row.user_id,
    fullName: row.full_name ?? row.email,
    email: row.email,
    phone: row.phone,
    role: row.role,
    joinedAt: row.joined_at,
    isYou: row.user_id === userId,
  }));
}

// Pending, unexpired requests. Returns [] for anyone who isn't an owner or
// manager.
export async function loadJoinRequests(
  supabase: SupabaseClient,
): Promise<JoinRequest[]> {
  const { data } = await supabase.rpc("list_join_requests");

  return ((data ?? []) as JoinRequestRow[]).map((row) => ({
    id: row.request_id,
    fullName: row.full_name ?? row.email,
    email: row.email,
    requestedRole: row.requested_role,
    requestedAt: row.requested_at,
  }));
}
