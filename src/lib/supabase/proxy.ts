import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
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

  // Staff routes — cookie-based auth, no Supabase user needed
  if (path.startsWith("/staff/") && !path.startsWith("/staff/login")) {
    const staffSession = request.cookies.get("staff_session")?.value;
    if (!staffSession || staffSession !== process.env.STAFF_SECRET) {
      const url = request.nextUrl.clone();
      url.pathname = "/staff/login";
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
      // Authenticated but wrong role — sign out and redirect to login with error
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
