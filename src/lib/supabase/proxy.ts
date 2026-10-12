import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const { data: claimsData } = await supabase.auth.getClaims();
  const user = claimsData?.claims;

  const path = request.nextUrl.pathname;

  const publicRoutes = ["/", "/sign-in", "/sign-up", "/forgot-password"];
  const isPublic =
    publicRoutes.includes(path) ||
    path.startsWith("/auth/") ||
    path.startsWith("/join") ||
    path.startsWith("/share");

  // 1. Public route → let through
  if (isPublic) return supabaseResponse;

  // The reset form runs on the session the email link just created. It needs
  // a user but not a company — someone mid-onboarding can forget theirs too.
  if (path === "/reset-password") {
    return user
      ? supabaseResponse
      : NextResponse.redirect(new URL("/forgot-password?expired=1", request.url));
  }

  // 2. No user → redirect to landing
  if (!user) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // 3. Has user + on auth route → redirect to projects
  if (["/sign-in", "/sign-up"].includes(path)) {
    return NextResponse.redirect(new URL("/projects", request.url));
  }

  // 4. Has user + no membership → redirect to onboarding/company
  const { data: membership } = await supabase
    .rpc("get_active_membership")
    .maybeSingle();

  if (!membership) {
    // No company yet — they can be waiting on a join request or naming
    // their own company. Anywhere else (including /onboarding/welcome) sends
    // them to whichever applies.
    if (path !== "/onboarding/company" && path !== "/onboarding/pending") {
      const { data: joinRequest } = await supabase
        .rpc("get_my_join_request")
        .maybeSingle();
      const target = joinRequest ? "/onboarding/pending" : "/onboarding/company";
      return NextResponse.redirect(new URL(target, request.url));
    }
  } else {
    // 5. Has company + hitting onboarding → bounce to projects,
    // except the post-signup welcome screen which is a legitimate step.
    if (path.startsWith("/onboarding") && path !== "/onboarding/welcome") {
      return NextResponse.redirect(new URL("/projects", request.url));
    }
  }

  // 6. Everything else → let through
  return supabaseResponse;
}
