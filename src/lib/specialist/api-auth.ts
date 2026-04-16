import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function requireSpecialistUser(): Promise<
  | { supabase: ReturnType<typeof createClient>; userId: string }
  | { error: NextResponse }
> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  const { data: prof } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (prof?.role !== "specialist") {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { supabase, userId: user.id };
}
