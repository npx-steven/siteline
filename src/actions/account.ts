"use server";

import { createClient } from "@/lib/supabase/server";
import { editAccountSchema } from "@/lib/validators/account";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { getAuthUser } from "@/lib/auth";

export async function editAccountAction(
  formData: FormData,
): Promise<{ error: string | null }> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const user = await getAuthUser();
  if (!user) return { error: "Not authenticated" };

  const parsed = editAccountSchema.safeParse({
    full_name: formData.get("full_name"),
    phone: formData.get("phone"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { full_name, phone } = parsed.data;

  const { error } = await supabase
    .from("users")
    .update({ full_name, phone: phone || null })
    .eq("id", user.id);

  if (error) return { error: "Failed to update account" };

  revalidatePath("/account");
  return { error: null };
}
