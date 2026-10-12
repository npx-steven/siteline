"use server";

import { getAuthUser } from "@/lib/auth";
import { SITE_URL } from "@/lib/site";
import { createClient } from "@/lib/supabase/server";
import {
  forgotPasswordSchema,
  resetPasswordSchema,
  signInSchema,
  signUpSchema,
} from "@/lib/validators/auth";
import { revalidatePath } from "next/cache";
import { cookies, headers } from "next/headers";
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

  // Check if user with credentials exists.
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

export async function requestPasswordResetAction(
  formData: FormData,
): Promise<AuthActionResult> {
  const parseData = forgotPasswordSchema.safeParse({
    email: formData.get("email"),
  });
  if (!parseData.success) {
    return { error: parseData.error.issues[0].message };
  }

  // The link must come back to whichever deployment sent it (localhost,
  // preview or production). Supabase only honours redirect URLs on its allow
  // list, so a spoofed Origin can't send the link anywhere else.
  const origin = (await headers()).get("origin") ?? SITE_URL;
  if (!origin) {
    return { error: "Couldn't send the reset email. Try again." };
  }

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { error } = await supabase.auth.resetPasswordForEmail(
    parseData.data.email,
    { redirectTo: `${origin}/auth/confirm` },
  );

  // Supabase reports success for unknown emails too, so the reply never
  // reveals whether an account exists. Rate limiting is the one error worth
  // explaining, since retrying straight away won't help.
  if (error) {
    if (error.status === 429) {
      return {
        error: "Too many reset emails. Wait a few minutes and try again.",
      };
    }
    return { error: "Couldn't send the reset email. Try again." };
  }

  return { error: null };
}

// Runs on the session created by the reset link (see app/auth/confirm).
export async function updatePasswordAction(
  formData: FormData,
): Promise<AuthActionResult> {
  const parseData = resetPasswordSchema.safeParse({
    password: formData.get("password"),
    confirm_password: formData.get("confirm_password"),
  });
  if (!parseData.success) {
    return { error: parseData.error.issues[0].message };
  }

  const user = await getAuthUser();
  if (!user) {
    return { error: "Your reset link has expired. Request a new one." };
  }

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { error } = await supabase.auth.updateUser({
    password: parseData.data.password,
  });

  if (error) {
    if (error.code === "same_password") {
      return { error: "Choose a password you haven't used before." };
    }
    if (error.code === "weak_password") {
      return { error: error.message };
    }
    return { error: "Couldn't update your password. Try again." };
  }

  // A reset usually means the old password can't be trusted, so end every
  // other session — including one someone else may have opened with it.
  await supabase.auth.signOut({ scope: "others" });

  return { error: null };
}

export async function signOutAction() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  await supabase.auth.signOut({ scope: "local" });
  revalidatePath("/", "layout");
  redirect("/");
}
