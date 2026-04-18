import Link from "next/link";
import { SiteHeader } from "@/components/marketing/site-header";

export default function PublicMarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <footer className="border-t bg-slate-50 dark:bg-slate-950/50">
        <div className="mx-auto max-w-6xl px-4 py-8">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            {/* Brand + tagline */}
            <div className="text-center sm:text-left">
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                CareMatch Global
              </p>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 italic">
                Clinical fit. Global reach.
              </p>
            </div>

            {/* Links */}
            <nav className="flex items-center gap-5 text-sm text-slate-500 dark:text-slate-400">
              <Link
                href="/privacy"
                className="transition-colors hover:text-slate-900 dark:hover:text-slate-100"
              >
                Privacy
              </Link>
              <span className="text-slate-300 dark:text-slate-700">·</span>
              <Link
                href="/terms"
                className="transition-colors hover:text-slate-900 dark:hover:text-slate-100"
              >
                Terms
              </Link>
              <span className="text-slate-300 dark:text-slate-700">·</span>
              <Link
                href="/contact"
                className="transition-colors hover:text-slate-900 dark:hover:text-slate-100"
              >
                Contact
              </Link>
            </nav>

            {/* Copyright */}
            <p className="text-xs text-slate-400 dark:text-slate-500">
              &copy; 2026 CareMatch Global
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
