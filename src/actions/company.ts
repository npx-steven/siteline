"use server";

import { createClient } from "@/lib/supabase/server";
import {
  createCompanySchema,
  editCompanySchema,
} from "@/lib/validators/company";
import { cookies } from "next/headers";
import { getAuthUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { getActiveMembership } from "@/lib/membership";
import { can } from "@/lib/permissions";

export async function createCompanyAction(
  formData: FormData,
): Promise<{ error: string | null }> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  // Get Authenticated User
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Parse raw data
  const rawData = {
    company_name: formData.get("company_name"),
  };

  const parseData = createCompanySchema.safeParse(rawData);
  if (!parseData.success) {
    return { error: parseData.error.issues[0].message };
  }

  const { company_name } = parseData.data;

  // Clients can't write memberships, so the company insert and the owner
  // membership happen together in one RPC.
  const { error } = await supabase.rpc("create_company", { company_name });

  if (error) {
    // P0001 is a RAISE from inside the function — its message is user-facing.
    return {
      error:
        error.code === "P0001" ? error.message : "Failed to create company",
    };
  }

  return { error: null };
}

export async function editCompanyAction(
  formData: FormData,
): Promise<{ error: string | null }> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const user = await getAuthUser();
  if (!user) return { error: "Not authenticated" };

  const membership = await getActiveMembership(supabase);
  if (!membership) return { error: "No company found" };
  if (!can.editCompany(membership.role))
    return { error: "Only owners can edit company" };

  const parsed = editCompanySchema.safeParse({
    company_name: formData.get("company_name"),
    license_number: formData.get("license_number"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { company_name, license_number } = parsed.data;

  const { error: companyError } = await supabase
    .from("companies")
    .update({ name: company_name, license_number: license_number || null })
    .eq("id", membership.companyId);

  if (companyError) return { error: "Failed to update company" };

  revalidatePath("/account");
  return { error: null };
}
