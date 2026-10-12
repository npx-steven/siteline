import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { cache } from "react";

export type AuthUser = {
  id: string;
  email: string | null;
};

// The signed-in user, read from the session JWT. The project signs tokens with
// an asymmetric key, so getClaims() verifies them locally against the cached
// JWKS instead of a round trip to the Auth server like getUser() — the same
// check the proxy and RLS already rely on. cache() dedupes repeat calls within
// one request.
//
// Lives outside actions/ on purpose: an export from a "use server" file is a
// public endpoint, and this is a helper, not an action.
export const getAuthUser = cache(async (): Promise<AuthUser | null> => {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) return null;
  return { id: claims.sub, email: claims.email ?? null };
});
