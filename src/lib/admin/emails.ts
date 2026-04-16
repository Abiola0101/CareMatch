import { resend } from "@/lib/resend";

const from = () =>
  process.env.RESEND_FROM_EMAIL?.trim() || "onboarding@resend.dev";

export async function sendSpecialistApprovedEmail(opts: {
  to: string;
  fullName: string;
  profileUrl: string;
}): Promise<{ ok: boolean; error?: string }> {
  if (!process.env.RESEND_API_KEY?.trim()) {
    console.warn("[email] RESEND_API_KEY missing — skip specialist approved");
    return { ok: false, error: "Email not configured" };
  }
  try {
    await resend.emails.send({
      from: from(),
      to: opts.to,
      subject: "Your CareMatch profile is now live",
      text: `Hi ${opts.fullName},

Your specialist profile has been verified and is now visible to matched patients.

Open your profile: ${opts.profileUrl}

Next steps: keep your care modes and availability up to date so patients see accurate information.

— CareMatch Global`,
    });
    return { ok: true };
  } catch (e) {
    console.error("[email] specialist approved", e);
    return { ok: false, error: "Send failed" };
  }
}

export async function sendSpecialistRejectedEmail(opts: {
  to: string;
  fullName: string;
  reason: string;
  profileUrl: string;
}): Promise<{ ok: boolean; error?: string }> {
  if (!process.env.RESEND_API_KEY?.trim()) {
    console.warn("[email] RESEND_API_KEY missing — skip specialist rejected");
    return { ok: false, error: "Email not configured" };
  }
  try {
    await resend.emails.send({
      from: from(),
      to: opts.to,
      subject: "Action required — additional information needed",
      text: `Hi ${opts.fullName},

We reviewed your specialist verification and need a bit more information before we can publish your profile.

Reason:
${opts.reason}

Please update your profile and re-upload any requested documents here:
${opts.profileUrl}

— CareMatch Global`,
    });
    return { ok: true };
  } catch (e) {
    console.error("[email] specialist rejected", e);
    return { ok: false, error: "Send failed" };
  }
}
