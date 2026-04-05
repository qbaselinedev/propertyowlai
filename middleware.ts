import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PROFESSIONAL_TYPES = ['conveyancer', 'lawyer']

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: any }[]) {
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

  const { data: { user } } = await supabase.auth.getUser();
  const { pathname } = request.nextUrl;

  // ── Not logged in — redirect to login ────────────────────────────────────
  if (!user && (pathname.startsWith("/dashboard") || pathname.startsWith("/admin"))) {
    return NextResponse.redirect(new URL("/auth/login", request.url));
  }

  if (user) {
    // ── Admin route — must have admin role ──────────────────────────────────
    if (pathname.startsWith("/admin")) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (profile?.role !== "admin") {
        return NextResponse.redirect(new URL("/dashboard", request.url));
      }
    }

    // ── Dashboard — block pending professionals ─────────────────────────────
    // Conveyancers and lawyers who are not yet verified cannot access the dashboard.
    // They must wait on the pending-approval page until admin approves them.
    if (pathname.startsWith("/dashboard")) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("user_type, conveyancer_verified")
        .eq("id", user.id)
        .single();

      if (
        profile &&
        PROFESSIONAL_TYPES.includes(profile.user_type ?? '') &&
        !profile.conveyancer_verified
      ) {
        return NextResponse.redirect(new URL("/auth/pending-approval", request.url));
      }
    }

    // ── Already logged in — redirect away from auth pages ──────────────────
    // But don't redirect away from pending-approval — they need to stay there
    if (
      pathname.startsWith("/auth/login") ||
      pathname.startsWith("/auth/signup")
    ) {
      // Check if they're a pending professional — send to pending page not dashboard
      const { data: profile } = await supabase
        .from("profiles")
        .select("user_type, conveyancer_verified")
        .eq("id", user.id)
        .single();

      if (
        profile &&
        PROFESSIONAL_TYPES.includes(profile.user_type ?? '') &&
        !profile.conveyancer_verified
      ) {
        return NextResponse.redirect(new URL("/auth/pending-approval", request.url));
      }

      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*", "/auth/:path*"],
};
