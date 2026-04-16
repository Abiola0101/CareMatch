import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pricing — CareMatch Global",
  description: "Patient and specialist subscription plans for CareMatch Global.",
};

export default function PricingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
