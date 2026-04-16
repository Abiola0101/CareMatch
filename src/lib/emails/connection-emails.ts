import { resend } from "@/lib/resend";

const from =
  process.env.RESEND_FROM_EMAIL?.trim() || "onboarding@resend.dev";

const appBase =
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || "http://localhost:3000";

function canSend(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim());
}

export async function sendNewConnectionToSpecialist(params: {
  to: string;
  specialistName: string;
  specialty: string | null;
  urgency: string | null;
  preferredMode: string;
  inboxUrl: string;
}): Promise<void> {
  if (!canSend()) {
    console.warn("[email] RESEND_API_KEY missing; skip specialist notify");
    return;
  }
  const modeLabel = formatPreferredMode(params.preferredMode);
  await resend.emails.send({
    from,
    to: params.to,
    subject: "New patient connection request",
    text: [
      `Hi ${params.specialistName},`,
      ``,
      `You have a new connection request on CareMatch Global.`,
      ``,
      `Specialty: ${params.specialty ?? "—"}`,
      `Urgency: ${formatUrgency(params.urgency)}`,
      `Preferred care mode: ${modeLabel}`,
      ``,
      `Clinical details are only shown in the app after you accept the request.`,
      ``,
      `Review and respond: ${params.inboxUrl}`,
    ].join("\n"),
  });
}

export async function sendConnectionAcceptedToPatient(params: {
  to: string;
  patientFirstName: string;
  specialistName: string;
  specialty: string | null;
  messagesUrl: string;
}): Promise<void> {
  if (!canSend()) {
    console.warn("[email] RESEND_API_KEY missing; skip patient accept notify");
    return;
  }
  await resend.emails.send({
    from,
    to: params.to,
    subject: "Your connection request was accepted",
    text: [
      `Hi ${params.patientFirstName},`,
      ``,
      `${params.specialistName} (${params.specialty ?? "Specialist"}) has accepted your connection request.`,
      ``,
      `Open your conversation: ${params.messagesUrl}`,
    ].join("\n"),
  });
}

export async function sendConnectionDeclinedToPatient(params: {
  to: string;
  patientFirstName: string;
  specialistName: string;
}): Promise<void> {
  if (!canSend()) {
    console.warn("[email] RESEND_API_KEY missing; skip patient decline notify");
    return;
  }
  await resend.emails.send({
    from,
    to: params.to,
    subject: "Update on your connection request",
    text: [
      `Hi ${params.patientFirstName},`,
      ``,
      `${params.specialistName} was not able to take on your connection request at this time.`,
      ``,
      `You can return to your case and explore other matched specialists when you are ready.`,
      ``,
      `${appBase}/dashboard`,
    ].join("\n"),
  });
}

function formatUrgency(u: string | null): string {
  switch (u) {
    case "routine":
      return "Routine";
    case "within_4_weeks":
      return "Within 4 weeks";
    case "within_1_week":
      return "Within 1 week (urgent)";
    default:
      return u ?? "—";
  }
}

function formatPreferredMode(mode: string): string {
  switch (mode) {
    case "remote":
      return "Remote second opinion";
    case "telemedicine":
      return "Telemedicine";
    case "medical_travel":
      return "Medical travel";
    case "fly_doctor":
      return "Fly the doctor";
    default:
      return mode;
  }
}
