import { type NextRequest, NextResponse } from "next/server";
import { rateLimitApiResponse } from "@/lib/api-rate-limit-middleware";
import {
  hasActivePlatformAccess,
} from "@/lib/auth/subscription";
import { patientProfileIncomplete } from "@/lib/auth/patient-profile";
import { resolveAuthenticatedDestination } from "@/lib/auth/post-auth-redirect";
import { updateSession } from "@/lib/supabase/middleware";

const protectedPrefixes = [
  "/dashboard",
  "/cases",
  "/connections",
  "/patient",
  "/specialist",
  "/insurer",
  "/admin",
  "/hospital",
];

function isProtectedRoute(pathname: string): boolean {
  if (pathname.startsWith("/share/")) {
    return false;
  }
  return protectedPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

function isSubscriptionExempt(pathname: string): boolean {
  if (
    pathname === "/signin" ||
    pathname === "/signup" ||
    pathname === "/reset-password"
  ) {
    return true;
  }
  if (
    pathname === "/onboarding/subscription" ||
    pathname.startsWith("/onboarding/subscription/")
  ) {
    return true;
  }
  if (
    pathname === "/onboarding/complete" ||
    pathname.startsWith("/onboarding/complete/")
  ) {
    return true;
  }
  if (
    pathname === "/onboarding/profile" ||
    pathname.startsWith("/onboarding/profile/")
  ) {
    return true;
  }
  if (
    pathname === "/specialists" ||
    pathname.startsWith("/specialists/")
  ) {
    return true;
  }
  if (pathname === "/pricing" || pathname.startsWith("/pricing/")) {
    return true;
  }
  if (pathname === "/about" || pathname.startsWith("/about/")) {
    return true;
  }
  if (
    pathname === "/auth/callback" ||
    pathname.startsWith("/auth/callback/")
  ) {
    return true;
  }
  if (pathname.startsWith("/share/")) {
    return true;
  }
  if (pathname === "/account-suspended") {
    return true;
  }
  return false;
}

function withCookies(from: NextResponse, to: NextResponse) {
  from.cookies.getAll().forEach((c) => {
    to.cookies.set(c.name, c.value);
  });
  return to;
}

export async function middleware(request: NextRequest) {
  const { response, user, supabase } = await updateSession(request);
  const pathname = request.nextUrl.pathname;

  if (pathname.startsWith("/api")) {
    const limited = rateLimitApiResponse(request, pathname, user?.id ?? null);
    if (limited) {
      return withCookies(response, limited);
    }
    return response;
  }

  if (!user) {
    if (isProtectedRoute(pathname)) {
      const url = request.nextUrl.clone();
      url.pathname = "/signin";
      url.searchParams.set("redirect", pathname);
      return withCookies(response, NextResponse.redirect(url));
    }
    return response;
  }

  const { data: suspRow } = await supabase
    .from("profiles")
    .select("suspended_at")
    .eq("id", user.id)
    .maybeSingle();

  if (
    suspRow?.suspended_at &&
    pathname !== "/account-suspended" &&
    pathname !== "/signin" &&
    pathname !== "/signup"
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/account-suspended";
    url.search = "";
    return withCookies(response, NextResponse.redirect(url));
  }

  if (pathname === "/signin" || pathname === "/signup") {
    if (suspRow?.suspended_at) {
      const url = request.nextUrl.clone();
      url.pathname = "/account-suspended";
      url.search = "";
      return withCookies(response, NextResponse.redirect(url));
    }
    const dest = await resolveAuthenticatedDestination(supabase, user.id);
    const url = request.nextUrl.clone();
    url.pathname = dest;
    url.search = "";
    return withCookies(response, NextResponse.redirect(url));
  }

  const hasAccess = await hasActivePlatformAccess(supabase, user.id);

  if (hasAccess) {
    const { data: roleRow } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (roleRow?.role === "patient") {
      const incomplete = await patientProfileIncomplete(supabase, user.id);
      if (incomplete) {
        const blocked =
          pathname === "/" ||
          pathname === "/dashboard" ||
          pathname === "/cases" ||
          pathname.startsWith("/cases/");
        if (blocked) {
          const url = request.nextUrl.clone();
          url.pathname = "/onboarding/profile";
          url.search = "";
          return withCookies(response, NextResponse.redirect(url));
        }
      }
    }
  }

  if (pathname === "/") {
    const url = request.nextUrl.clone();
    if (hasAccess) {
      url.pathname = await resolveAuthenticatedDestination(supabase, user.id);
    } else {
      url.pathname = "/onboarding/subscription";
    }
    url.search = "";
    return withCookies(response, NextResponse.redirect(url));
  }

  if (!hasAccess && !isSubscriptionExempt(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/onboarding/subscription";
    url.search = "";
    return withCookies(response, NextResponse.redirect(url));
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
