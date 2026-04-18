import Link from "next/link";
import { SignOutButton } from "@/app/dashboard/sign-out-button";

export function PatientAppHeader() {
  return (
    <header className="border-b bg-background">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link href="/dashboard" className="font-semibold tracking-tight">
          CareMatch Global
        </Link>
        <div className="flex items-center gap-3">
          <Link
            href="/connections"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Messages
          </Link>
          <SignOutButton />
        </div>
      </div>
    </header>
  );
}
