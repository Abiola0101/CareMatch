import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { z } from "zod";
import { resend } from "@/lib/resend";
import { contactLimiter, checkRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Valid email required"),
  enquiryType: z.string().min(1),
  message: z.string().min(1, "Message is required"),
});

export async function POST(request: Request) {
  const ip = headers().get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const { limited } = await checkRateLimit(contactLimiter, `contact:${ip}`);
  if (limited) {
    return NextResponse.json(
      { error: "Too many submissions. Please try again later." },
      { status: 429 },
    );
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid form data" },
      { status: 400 },
    );
  }

  const { name, email, enquiryType, message } = parsed.data;

  const apiKey = process.env.RESEND_API_KEY?.trim();
  const inboxEmail =
    process.env.CONTACT_INBOX_EMAIL?.trim() ||
    process.env.RESEND_FROM_EMAIL?.trim() ||
    "hello@carematchglobal.com";
  const fromEmail =
    process.env.RESEND_FROM_EMAIL?.trim() || "onboarding@resend.dev";

  if (!apiKey) {
    console.warn("[contact] RESEND_API_KEY missing — logging enquiry instead");
    console.log("[contact enquiry]", { name, email, enquiryType, message });
    return NextResponse.json({ ok: true });
  }

  const enquiryLabel: Record<string, string> = {
    insurer: "Insurer / enterprise access",
    specialist: "Specialist listing",
    patient: "Patient support",
    partnership: "Partnership",
    other: "Other",
  };

  try {
    // Notify the CareMatch team
    await resend.emails.send({
      from: fromEmail,
      to: inboxEmail,
      replyTo: email,
      subject: `New enquiry: ${enquiryLabel[enquiryType] ?? enquiryType} — ${name}`,
      text: [
        `New contact form submission`,
        ``,
        `Name: ${name}`,
        `Email: ${email}`,
        `Enquiry type: ${enquiryLabel[enquiryType] ?? enquiryType}`,
        ``,
        `Message:`,
        message,
        ``,
        `---`,
        `Reply directly to this email to respond to ${name}.`,
      ].join("\n"),
    });

    // Send confirmation to the person who submitted
    await resend.emails.send({
      from: fromEmail,
      to: email,
      subject: "We received your message — CareMatch Global",
      text: [
        `Hi ${name},`,
        ``,
        `Thanks for reaching out to CareMatch Global. We've received your message and will get back to you within one business day.`,
        ``,
        `Your enquiry:`,
        message,
        ``,
        `— The CareMatch Global team`,
      ].join("\n"),
    });
  } catch (e) {
    console.error("[contact] Resend error", e);
    return NextResponse.json(
      { error: "Failed to send message. Please try again." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
