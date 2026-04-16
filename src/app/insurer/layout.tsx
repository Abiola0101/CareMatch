import Link from "next/link";
import { SignOutButton } from "@/app/dashboard/sign-out-button";

export default function InsurerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b bg-background">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4">
          <Link href="/insurer/dashboard" className="font-semibold tracking-tight">
            CareMatch · Insurer
          </Link>
          <nav className="flex flex-1 items-center justify-end gap-4 text-sm">
            <Link href="/insurer/dashboard" className="text-muted-foreground hover:text-foreground">
              Dashboard
            </Link>
            <Link href="/insurer/cases" className="text-muted-foreground hover:text-foreground">
              Cases
            </Link>
            <Link href="/insurer/cases/new" className="text-muted-foreground hover:text-foreground">
              New case
            </Link>
            <Link href="/" className="text-muted-foreground hover:text-foreground">
              Home
            </Link>
            <SignOutButton />
          </nav>
        </div>
      </header>
      {children}
    </div>
  );
}
