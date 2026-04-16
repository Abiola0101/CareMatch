import { PatientAppHeader } from "@/components/patient/patient-app-header";

export default function ConnectionsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <PatientAppHeader />
      {children}
    </div>
  );
}
