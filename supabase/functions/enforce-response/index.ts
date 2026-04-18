import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const RESEND_API_URL = "https://api.resend.com/emails";
const FROM_ADDRESS = "CareMatch Global <noreply@carematchglobal.com>";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ConnectionWithProfiles = {
  id: string;
  specialist_id: string;
  patient_id: string;
  enquired_at: string;
  specialist_email: string | null;
  specialist_name: string | null;
  patient_email: string | null;
  patient_name: string | null;
};

// ---------------------------------------------------------------------------
// Email helper
// ---------------------------------------------------------------------------

async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
  resendKey: string;
}): Promise<void> {
  const res = await fetch(RESEND_API_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${opts.resendKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: FROM_ADDRESS,
      to: [opts.to],
      subject: opts.subject,
      html: opts.html,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error(`[enforce-response] Resend error ${res.status}: ${body}`);
  }
}

// ---------------------------------------------------------------------------
// Response rate recalculation
// ---------------------------------------------------------------------------

async function recalcResponseRate(
  admin: ReturnType<typeof createClient>,
  specialistId: string,
): Promise<void> {
  const { data: rows, error } = await admin
    .from("connections")
    .select("specialist_first_responded_at")
    .eq("specialist_id", specialistId)
    .in("status", ["accepted", "declined"]);

  if (error) {
    console.error("[enforce-response] recalcResponseRate query error:", error);
    return;
  }

  const total = (rows ?? []).length;
  if (total === 0) {
    return;
  }

  const responded = (rows ?? []).filter(
    (r) => r.specialist_first_responded_at !== null,
  ).length;

  const pct = Math.round((responded / total) * 100);

  const { error: upErr } = await admin
    .from("specialist_profiles")
    .update({ response_rate_pct: pct })
    .eq("id", specialistId);

  if (upErr) {
    console.error("[enforce-response] recalcResponseRate update error:", upErr);
  }
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

serve(async (_req: Request): Promise<Response> => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const resendKey = Deno.env.get("RESEND_API_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(
      JSON.stringify({ error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  if (!resendKey) {
    return new Response(
      JSON.stringify({ error: "Missing RESEND_API_KEY" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  let reminders24Sent = 0;
  let escalations48Sent = 0;
  const errors: string[] = [];

  // -------------------------------------------------------------------------
  // 1. 24-hour reminders
  //    pending + enquired_at < now()-24h + reminder_24h_sent_at IS NULL
  //    + escalation_48h_sent_at IS NULL (don't double-email near the boundary)
  // -------------------------------------------------------------------------
  {
    const { data: rows24, error: err24 } = await admin
      .from("connections")
      .select(
        "id, specialist_id, patient_id, enquired_at",
      )
      .eq("status", "pending")
      .lt("enquired_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .is("reminder_24h_sent_at", null)
      .is("escalation_48h_sent_at", null);

    if (err24) {
      console.error("[enforce-response] 24h query error:", err24);
      errors.push(`24h query: ${err24.message}`);
    } else {
      for (const row of rows24 ?? []) {
        // Fetch specialist email/name
        const { data: specProf } = await admin
          .from("profiles")
          .select("email, full_name")
          .eq("id", row.specialist_id)
          .maybeSingle();

        if (!specProf?.email) {
          console.warn(`[enforce-response] No specialist email for connection ${row.id}`);
          continue;
        }

        // Send 24h reminder to specialist
        await sendEmail({
          to: specProf.email,
          subject: "Patient enquiry awaiting your response",
          html: `<p>A patient has sent you an enquiry on CareMatch Global. Please log in and respond within 24 hours to maintain your response rate.</p><p><a href="https://www.carematchglobal.com/specialist/dashboard">Login: https://www.carematchglobal.com/specialist/dashboard</a></p>`,
          resendKey,
        });

        // Mark reminder sent
        const { error: upErr } = await admin
          .from("connections")
          .update({ reminder_24h_sent_at: new Date().toISOString() })
          .eq("id", row.id);

        if (upErr) {
          console.error(`[enforce-response] 24h update error for ${row.id}:`, upErr);
          errors.push(`24h update ${row.id}: ${upErr.message}`);
        } else {
          reminders24Sent++;
        }
      }
    }
  }

  // -------------------------------------------------------------------------
  // 2. 48-hour escalations
  //    pending + enquired_at < now()-48h + escalation_48h_sent_at IS NULL
  // -------------------------------------------------------------------------
  {
    const { data: rows48, error: err48 } = await admin
      .from("connections")
      .select(
        "id, specialist_id, patient_id, enquired_at",
      )
      .eq("status", "pending")
      .lt("enquired_at", new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString())
      .is("escalation_48h_sent_at", null);

    if (err48) {
      console.error("[enforce-response] 48h query error:", err48);
      errors.push(`48h query: ${err48.message}`);
    } else {
      for (const row of rows48 ?? []) {
        const { data: specProf } = await admin
          .from("profiles")
          .select("email, full_name")
          .eq("id", row.specialist_id)
          .maybeSingle();

        const { data: patientProf } = await admin
          .from("profiles")
          .select("email, full_name")
          .eq("id", row.patient_id)
          .maybeSingle();

        // Send escalation email to specialist
        if (specProf?.email) {
          await sendEmail({
            to: specProf.email,
            subject: "Urgent: Patient enquiry still awaiting response",
            html: `<p>You have not responded to a patient enquiry within 48 hours. Your response rate will be affected. Please respond immediately:</p><p><a href="https://www.carematchglobal.com/specialist/dashboard">https://www.carematchglobal.com/specialist/dashboard</a></p>`,
            resendKey,
          });
        } else {
          console.warn(`[enforce-response] No specialist email for connection ${row.id}`);
        }

        // Send notification email to patient
        if (patientProf?.email) {
          await sendEmail({
            to: patientProf.email,
            subject: "Update on your specialist enquiry",
            html: `<p>We have followed up with your matched specialist regarding your enquiry. We will notify you as soon as they respond.</p><p>If you would like to contact a different specialist, please visit your dashboard: <a href="https://www.carematchglobal.com/patient/dashboard">https://www.carematchglobal.com/patient/dashboard</a></p>`,
            resendKey,
          });
        } else {
          console.warn(`[enforce-response] No patient email for connection ${row.id}`);
        }

        // Mark escalation sent
        const { error: upErr } = await admin
          .from("connections")
          .update({ escalation_48h_sent_at: new Date().toISOString() })
          .eq("id", row.id);

        if (upErr) {
          console.error(`[enforce-response] 48h update error for ${row.id}:`, upErr);
          errors.push(`48h update ${row.id}: ${upErr.message}`);
          continue;
        }

        // Recalculate specialist response rate
        await recalcResponseRate(admin, row.specialist_id);

        escalations48Sent++;
      }
    }
  }

  const result = {
    ok: true,
    reminders_24h_sent: reminders24Sent,
    escalations_48h_sent: escalations48Sent,
    errors,
  };

  console.log("[enforce-response] done:", result);

  return new Response(JSON.stringify(result), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
