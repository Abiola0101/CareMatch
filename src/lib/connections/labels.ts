export function modeLabel(m: string | null): string {
  switch (m) {
    case "remote": return "Remote second opinion";
    case "telemedicine": return "Telemedicine";
    case "medical_travel": return "Medical travel";
    case "fly_doctor": return "Fly the doctor";
    default: return m ?? "—";
  }
}

export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return days < 7 ? `${days}d ago` : new Date(iso).toLocaleDateString();
}
