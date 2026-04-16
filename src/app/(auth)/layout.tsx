export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh w-full bg-muted/30 px-6 py-10">
      <div className="relative z-20 mx-auto w-full max-w-md">{children}</div>
    </div>
  );
}
