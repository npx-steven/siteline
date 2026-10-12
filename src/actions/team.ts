"use server";

import type { GrantableRole } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";
import type { PostgrestError } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

// Owner-only member changes. The rules (owners only, never yourself, never
// another owner) live in change_member_role / remove_member in
// supabase/migrations/20261012035022_member_management.sql.

type ActionResult = { error: string | null };

// P0001 is a RAISE from inside the function — its message is user-facing.
function rpcError(error: PostgrestError, fallback: string): string {
  return error.code === "P0001" ? error.message : fallback;
}

export async function changeMemberRoleAction(
  userId: string,
  role: GrantableRole,
): Promise<ActionResult> {
  const supabase = createClient(await cookies());
  const { error } = await supabase.rpc("change_member_role", {
    target_user: userId,
    new_role: role,
  });

  if (error) return { error: rpcError(error, "Couldn't change their role") };

  revalidatePath("/account", "layout");
  return { error: null };
}

export async function removeMemberAction(userId: string): Promise<ActionResult> {
  const supabase = createClient(await cookies());
  const { error } = await supabase.rpc("remove_member", { target_user: userId });

  if (error) return { error: rpcError(error, "Couldn't remove them") };

  revalidatePath("/account", "layout");
  return { error: null };
}
