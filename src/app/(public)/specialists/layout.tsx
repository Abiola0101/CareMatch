import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Specialists — CareMatch Global",
  description:
    "Browse verified specialists across cardiology, oncology, and orthopaedics.",
};

export default function SpecialistsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
