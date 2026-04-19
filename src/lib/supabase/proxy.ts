import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "./database.types";
import { STAFF_ROLES } from "../shared-types/roles";

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

  // Admin routes — require Supabase Auth with admin role
  if (path.startsWith("/admin") && !path.startsWith("/admin/login")) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin/login";
      return NextResponse.redirect(url);
    }
    const role = user.app_metadata?.role as string | undefined;
    if (role !== "admin") {
      const url = request.nextUrl.clone();
      url.pathname = "/admin/login";
      url.searchParams.set("error", "unauthorized");
      return NextResponse.redirect(url);
    }
    return supabaseResponse;
  }

  // Staff login/verify — redirect to dashboard if already authenticated as staff
  if (path.startsWith("/staff/login") || path.startsWith("/staff/verify")) {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const role = user.app_metadata?.role as string | undefined;
      if (role && (STAFF_ROLES as readonly string[]).includes(role)) {
        const url = request.nextUrl.clone();
        url.pathname = "/staff/dashboard";
        return NextResponse.redirect(url);
      }
    }
    return supabaseResponse;
  }

  // Staff routes — require Supabase Auth with a staff role
  if (path.startsWith("/staff/")) {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const role = user.app_metadata?.role as string | undefined;
      if (role && (STAFF_ROLES as readonly string[]).includes(role)) {
        return supabaseResponse;
      }
    }

    const url = request.nextUrl.clone();
    url.pathname = "/staff/login";
    return NextResponse.redirect(url);
  }

  // eMock login/verify — redirect to /emock if already authenticated
  if (path.startsWith("/emock/login") || path.startsWith("/emock/verify")) {
    const { data: { user: emockUser } } = await supabase.auth.getUser();
    if (emockUser) {
      const url = request.nextUrl.clone();
      url.pathname = "/emock";
      return NextResponse.redirect(url);
    }
    return supabaseResponse;
  }

  // eMock protected routes — require any authenticated user
  if (path.startsWith("/emock")) {
    const { data: { user: emockUser } } = await supabase.auth.getUser();
    if (!emockUser) {
      const url = request.nextUrl.clone();
      url.pathname = "/emock/login";
      return NextResponse.redirect(url);
    }
    return supabaseResponse;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const role = user?.app_metadata?.role as string | undefined;
  const isCandidate = role === "candidate";

  // Protected routes — redirect to login if not authenticated OR not a candidate
  const protectedPaths = [
    "/candidate/onboarding",
    "/candidate/enneagram-quiz",
    "/candidate/enneagram-results",
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
  // Exception: allow through if ?token= is present (returning candidate clicking new invite link)
  const authPaths = ["/candidate/login", "/candidate/verify"];
  if (
    user &&
    isCandidate &&
    authPaths.some((p) => path.startsWith(p)) &&
    !request.nextUrl.searchParams.has("token")
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/candidate/onboarding";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
