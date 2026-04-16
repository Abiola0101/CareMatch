import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ConnectionThread } from "@/components/connections/ConnectionThread";

export default async function PatientConnectionMessagesPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/signin");

  const { data: conn, error: ce } = await supabase
    .from("connections")
    .select("id, patient_id, specialist_id, status")
    .eq("id", params.id)
    .maybeSingle();

  if (ce || !conn) notFound();
  if (conn.patient_id !== user.id) notFound();
  if (conn.status !== "accepted") {
    redirect("/connections");
  }

  const { data: msgs } = await supabase
    .from("messages")
    .select("id, sender_id, content, created_at")
    .eq("connection_id", params.id)
    .order("created_at", { ascending: true });

  const { data: peer } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", conn.specialist_id)
    .maybeSingle();

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6">
        <Link
          href="/connections"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← All connections
        </Link>
      </div>
      <h1 className="text-2xl font-semibold tracking-tight">Messages</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Conversation with {peer?.full_name ?? "your specialist"}.
      </p>

      <div className="mt-8">
        <ConnectionThread
          connectionId={params.id}
          initialMessages={msgs ?? []}
          currentUserId={user.id}
          peerLabel={peer?.full_name ?? "Specialist"}
        />
      </div>
    </main>
  );
}
