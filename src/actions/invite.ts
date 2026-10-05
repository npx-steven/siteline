"use server";

import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { getAuthUser } from "./auth";

export async function validateInviteAction(token: string): Promise<{
  invite: { company_name: string } | null;
  error: string | null;
}> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  // Invites and companies aren't readable directly — get_invite resolves only
  // the exact token, and only while it is pending and unexpired.
  const { data, error } = await supabase
    .rpc("get_invite", { invite_token: token })
    .maybeSingle<{ company_name: string; role: string }>();

  if (error) {
    return { invite: null, error: "Failed to get invite data" };
  }

  if (!data) {
    return { invite: null, error: "Invite is invalid or has expired" };
  }

  return { invite: { company_name: data.company_name }, error: null };
}

export async function joinCompanyAction(
  token: string,
): Promise<{ error: string | null }> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const user = await getAuthUser();
  if (!user) {
    return { error: "Not Authenticated" };
  }

  // accept_invite validates the token and assigns the invite's role (never
  // owner) in one step — clients can't write company_id or role themselves.
  const { error } = await supabase.rpc("accept_invite", {
    invite_token: token,
  });

  if (error) {
    // P0001 is a RAISE from inside the function — its message is user-facing.
    return {
      error: error.code === "P0001" ? error.message : "Failed to join company",
    };
  }

  revalidatePath("/account");
  return { error: null };
}
