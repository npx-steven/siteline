"use server";

import { createClient } from "@/lib/supabase/server";
import { signInSchema, signUpSchema } from "@/lib/validators/auth";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export type AuthActionResult = {
  error: string | null;
};

export async function signUpAction(
  formData: FormData,
): Promise<AuthActionResult> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const rawData = {
    first_name: formData.get("first_name"),
    last_name: formData.get("last_name"),
    email: formData.get("email"),
    password: formData.get("password"),
  };

  const parseData = signUpSchema.safeParse(rawData);
  if (!parseData.success) {
    return { error: parseData.error.issues[0].message };
  }

  const { email, password, first_name, last_name } = parseData.data;

  // Create Supabase auth user. The public.users profile row is created from
  // this metadata by the on_auth_user_created trigger, in the same
  // transaction, so an auth user can never exist without one.
  const { data, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: `${first_name.trim()} ${last_name.trim()}` },
    },
  });

  if (authError) {
    // Supabase returns "User already registered" when confirmation is off
    if (authError.message.toLowerCase().includes("already registered")) {
      return { error: "An account with this email already exists." };
    }
    return { error: authError.message };
  }

  if (!data.user) {
    return { error: "Sign up failed. Please try again." };
  }

  // Enumeration-safe existing-email detection (when email confirmation is ON,
  // Supabase returns a user with an empty identities array instead of an error)
  if (data.user.identities && data.user.identities.length === 0) {
    return { error: "An account with this email already exists." };
  }

  return { error: null };
}

export async function signInAction(
  formData: FormData,
): Promise<AuthActionResult> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  // Validate the raw form data with our zod sign in schema
  const rawData = {
    email: formData.get("email"),
    password: formData.get("password"),
  };

  const parseData = signInSchema.safeParse(rawData);
  if (!parseData.success) {
    return { error: parseData.error.issues[0].message };
  }

  const { email, password } = parseData.data;

  // Check if user with cerdentials exisits.
  const { data, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (authError) {
    return { error: authError.message };
  }

  if (!data.user) {
    return { error: "Sign in failed. Please try again." };
  }
  return { error: null };
}

export async function signOutAction() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  await supabase.auth.signOut({ scope: "local" });
  revalidatePath("/", "layout");
  redirect("/");
}

export async function getAuthUser() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}
