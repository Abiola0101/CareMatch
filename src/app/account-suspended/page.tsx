import Link from "next/link";

export default function AccountSuspendedPage() {
  return (
    <main className="mx-auto max-w-lg px-4 py-16 text-center">
      <h1 className="text-2xl font-semibold">Account suspended</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        Your CareMatch account has been suspended. If you believe this is a mistake, contact
        support.
      </p>
      <p className="mt-6 text-sm">
        <Link href="/signin" className="text-primary underline">
          Back to sign in
        </Link>
      </p>
    </main>
  );
}
