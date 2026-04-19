import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { ensureRoleSpecificProfile } from "@/lib/auth/role-profiles";
import { resolveAuthenticatedDestination } from "@/lib/auth/post-auth-redirect";

function safeNextPath(next: string | null): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) {
    return "/";
  }
  return next;
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = safeNextPath(requestUrl.searchParams.get("next"));

  if (!code) {
    return NextResponse.redirect(new URL("/", requestUrl.origin));
  }

  const cookieStore = cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(
          cookiesToSet: {
            name: string;
            value: string;
            options: CookieOptions;
          }[]
        ) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server Component boundary; session refresh handled by middleware.
          }
        },
      },
    }
  );

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    const url = new URL("/signin", requestUrl.origin);
    url.searchParams.set("error", "session");
    return NextResponse.redirect(url);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile?.role) {
      // New OAuth user — needs to pick a role
      return NextResponse.redirect(new URL("/onboarding/role", requestUrl.origin));
    }

    await ensureRoleSpecificProfile(supabase, user.id, profile.role);

    // If the caller explicitly provided a `next` param, honour it;
    // otherwise resolve the best destination based on the user's state.
    const rawNext = requestUrl.searchParams.get("next");
    const explicitNext = rawNext && rawNext !== "/" ? safeNextPath(rawNext) : null;

    if (explicitNext && explicitNext !== "/") {
      return NextResponse.redirect(new URL(explicitNext, requestUrl.origin));
    }

    const dest = await resolveAuthenticatedDestination(supabase, user.id);
    return NextResponse.redirect(new URL(dest, requestUrl.origin));
  }

  return NextResponse.redirect(new URL(next, requestUrl.origin));
}
