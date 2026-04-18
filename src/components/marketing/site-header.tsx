import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navLink =
  "text-sm font-medium text-muted-foreground transition-colors hover:text-foreground";

export function SiteHeader({ className }: { className?: string }) {
  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60",
        className,
      )}
    >
      <div className="mx-auto flex min-h-14 max-w-6xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:py-0">
        <div className="flex items-center justify-between gap-4 sm:justify-start">
          <Link
            href="/"
            className="flex items-center gap-2 text-lg font-semibold tracking-tight"
          >
            {/* Medical cross accent */}
            <span className="flex h-6 w-6 items-center justify-center rounded bg-primary text-[11px] font-bold text-primary-foreground leading-none select-none">
              ✚
            </span>
            CareMatch Global
          </Link>
          <div className="flex items-center gap-2 sm:hidden">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/signin">Sign in</Link>
            </Button>
            <Button size="sm" className="font-semibold" asChild>
              <Link href="/signup">Get started</Link>
            </Button>
          </div>
        </div>
        <nav className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs sm:text-sm md:gap-6">
          <Link href="/#how-it-works" className={navLink}>
            How it works
          </Link>
          <Link href="/specialists" className={navLink}>
            Specialists
          </Link>
          <Link href="/pricing" className={navLink}>
            Pricing
          </Link>
          <Link href="/about" className={navLink}>
            About
          </Link>
        </nav>
        <div className="hidden items-center gap-2 sm:flex">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/signin">Sign in</Link>
          </Button>
          <Button size="sm" className="font-semibold shadow-sm" asChild>
            <Link href="/signup">Get started</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
