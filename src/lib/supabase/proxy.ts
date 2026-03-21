import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "./database.types";

const STAFF_ROLES = ["manager", "director", "admin"];

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const path = request.nextUrl.pathname;

  // Staff routes — dual auth during transition (Supabase Auth + legacy cookie)
  if (path.startsWith("/staff/") && !path.startsWith("/staff/login") && !path.startsWith("/staff/verify")) {
    // Check Supabase Auth session first (new method)
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const role = user.app_metadata?.role as string | undefined;
      if (role && STAFF_ROLES.includes(role)) {
        return supabaseResponse;
      }
    }

    // Fallback: check old staff_session cookie (transition period)
    const staffSession = request.cookies.get("staff_session")?.value;
    if (staffSession && staffSession.length >= 32) {
      return supabaseResponse;
    }

    // Neither auth method worked — redirect to login
    const url = request.nextUrl.clone();
    url.pathname = "/staff/login";
    return NextResponse.redirect(url);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const role = user?.app_metadata?.role as string | undefined;
  const isCandidate = role === "candidate";

  // Protected routes — redirect to login if not authenticated OR not a candidate
  const protectedPaths = [
    "/candidate/onboarding",
    "/candidate/disc-quiz",
    "/candidate/disc-results",
  ];
  if (protectedPaths.some((p) => path.startsWith(p))) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = "/candidate/login";
      return NextResponse.redirect(url);
    }
    if (!isCandidate) {
      // Authenticated but wrong role — redirect to login with error
      const url = request.nextUrl.clone();
      url.pathname = "/candidate/login";
      url.searchParams.set("error", "unauthorized_role");
      return NextResponse.redirect(url);
    }
  }

  // Already authenticated as candidate — redirect away from login/verify
  const authPaths = ["/candidate/login", "/candidate/verify"];
  if (user && isCandidate && authPaths.some((p) => path.startsWith(p))) {
    const url = request.nextUrl.clone();
    url.pathname = "/candidate/onboarding";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
