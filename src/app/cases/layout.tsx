import { PatientAppHeader } from "@/components/patient/patient-app-header";

export default function CasesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <PatientAppHeader />
      {children}
    </div>
  );
}
