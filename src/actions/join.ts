"use server";

import type { GrantableRole } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";
import type { PostgrestError } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

// Every rule (who may approve, link validity, one open request per person)
// lives in the join RPCs in supabase/migrations/20261011223035_join_requests.sql.
// These actions only call them and translate errors.

type ActionResult = { error: string | null };

// P0001 is a RAISE from inside the function — its message is user-facing.
function rpcError(error: PostgrestError, fallback: string): string {
  return error.code === "P0001" ? error.message : fallback;
}

async function client() {
  return createClient(await cookies());
}

// --- Owner: the company join link ------------------------------------------

export async function getJoinLinkAction(
  role: GrantableRole,
  rotate = false,
): Promise<{
  error: string | null;
  token?: string;
  expiresAt?: string;
}> {
  const supabase = await client();
  const { data, error } = await supabase
    .rpc("get_join_link", { link_role: role, rotate })
    .single<{ link_token: string; link_expires_at: string }>();

  if (error || !data) {
    return {
      error: error
        ? rpcError(error, "Couldn't load the join link")
        : "Couldn't load the join link",
    };
  }

  return { error: null, token: data.link_token, expiresAt: data.link_expires_at };
}

// --- Owner: review requests -------------------------------------------------

export async function approveJoinRequestAction(
  requestId: string,
  role: GrantableRole,
): Promise<ActionResult> {
  const supabase = await client();
  const { error } = await supabase.rpc("approve_join_request", {
    request_id: requestId,
    new_role: role,
  });

  if (error) return { error: rpcError(error, "Couldn't approve the request") };

  revalidatePath("/account", "layout");
  return { error: null };
}

export async function declineJoinRequestAction(
  requestId: string,
): Promise<ActionResult> {
  const supabase = await client();
  const { error } = await supabase.rpc("decline_join_request", {
    request_id: requestId,
  });

  if (error) return { error: rpcError(error, "Couldn't decline the request") };

  revalidatePath("/account", "layout");
  return { error: null };
}

// --- Requester --------------------------------------------------------------

export async function requestToJoinAction(token: string): Promise<ActionResult> {
  const supabase = await client();
  const { error } = await supabase.rpc("request_to_join", { link_token: token });

  if (error) return { error: rpcError(error, "Couldn't send your request") };
  return { error: null };
}

export async function cancelJoinRequestAction(): Promise<ActionResult> {
  const supabase = await client();
  const { error } = await supabase.rpc("cancel_join_request");

  if (error) return { error: "Couldn't cancel your request" };
  return { error: null };
}
