import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { z } from "zod";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  fullName: z.string().min(1, "Full name is required"),
  role: z.enum(["patient", "specialist", "hospital", "insurer"]),
  termsAccepted: z.literal(true),
});

export async function POST(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url?.trim() || !anon?.trim()) {
    return NextResponse.json(
      {
        error:
          "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY on the server.",
      },
      { status: 500 }
    );
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    const first =
      parsed.error.issues[0]?.message ??
      "Invalid form data. Accept the terms and check all fields.";
    return NextResponse.json({ error: first }, { status: 400 });
  }

  const email = parsed.data.email.trim().toLowerCase();
  const { password, fullName, role } = parsed.data;
  const cookieStore = cookies();

  const supabase = createServerClient(url.trim(), anon.trim(), {
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
          // Server may reject cookie writes in some edge cases; session can still be restored via sign-in.
        }
      },
    },
  });

  const appBase =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "http://localhost:3000";

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${appBase}/auth/callback`,
      data: {
        role,
        full_name: fullName.trim(),
      },
    },
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  if (!data.user) {
    return NextResponse.json(
      { error: "Signup did not return a user. Try again." },
      { status: 500 }
    );
  }

  const needsEmailConfirm = !data.session;

  if (data.session) {
    await supabase
      .from("profiles")
      .update({
        full_name: fullName.trim(),
        email: email.trim(),
      })
      .eq("id", data.user.id);
  }

  return NextResponse.json({
    ok: true as const,
    needsEmailConfirm,
    userId: data.user.id,
  });
}
