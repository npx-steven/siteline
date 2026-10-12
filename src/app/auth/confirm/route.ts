import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";

// Where a password reset email lands. A valid link signs the user in with a
// recovery session and sends them to choose a new password.
//
// Two link shapes arrive here:
// - ?token_hash=…&type=recovery, from the customised "Reset password" email
//   template. Works on any device, so a link requested on a laptop can be
//   opened from a phone's mail app.
// - ?code=…, from Supabase's default template (PKCE). Only works in the
//   browser that requested the reset, since the code verifier is a cookie.
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const code = searchParams.get("code");

  const supabase = createClient(await cookies());

  let verified = false;
  if (tokenHash && type === "recovery") {
    const { error } = await supabase.auth.verifyOtp({
      type: "recovery",
      token_hash: tokenHash,
    });
    verified = !error;
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    verified = !error;
  }

  // Expired, already used, or opened in a different browser than the one
  // that asked for it (the ?code= shape).
  redirect(verified ? "/reset-password" : "/forgot-password?expired=1");
}
