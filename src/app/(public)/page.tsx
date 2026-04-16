import Link from "next/link";
import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = {
  title: "CareMatch Global — Global specialist matching",
  description:
    "Find the best clinical fit across cardiology, oncology, and orthopaedics. CareMatch searches globally.",
};

const showcaseSpecialists = [
  {
    name: "Dr. Elena Vasquez",
    title: "Professor of Cardiology",
    specialty: "Cardiology",
    institution: "European Heart Institute",
    country: "Spain",
    caseVolume: 420,
    languages: ["English", "Spanish", "French"],
  },
  {
    name: "Dr. James Okonkwo",
    title: "Surgical Oncology Lead",
    specialty: "Oncology",
    institution: "Lagos University Teaching Hospital",
    country: "Nigeria",
    caseVolume: 310,
    languages: ["English", "Igbo"],
  },
  {
    name: "Dr. Mei Tanaka",
    title: "Orthopaedic Oncology",
    specialty: "Orthopaedics & MSK",
    institution: "Osaka National Hospital",
    country: "Japan",
    caseVolume: 280,
    languages: ["Japanese", "English"],
  },
];

export default function MarketingHomePage() {
  return (
    <div>
      {/* Hero */}
      <section className="border-b bg-muted/30">
        <div className="mx-auto max-w-6xl px-3 py-16 sm:px-4 sm:py-20 md:py-28">
          <h1 className="max-w-3xl text-3xl font-semibold tracking-tight sm:text-4xl md:text-5xl">
            The best specialist for you may not be in your country
          </h1>
          <p className="mt-6 max-w-2xl text-base text-muted-foreground sm:text-lg md:text-xl">
            CareMatch searches globally across cardiology, oncology, and
            orthopaedics. Clinical fit is the only ranking criteria.
          </p>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:gap-4">
            <Button size="lg" asChild>
              <Link href="/signup">Find my specialist</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <a href="#how-it-works">See how it works</a>
            </Button>
          </div>
        </div>
      </section>

      {/* Three specialties */}
      <section className="mx-auto max-w-6xl px-4 py-16 md:py-24">
        <h2 className="text-center text-2xl font-semibold tracking-tight md:text-3xl">
          Three specialties
        </h2>
        <p className="mx-auto mt-2 max-w-2xl text-center text-muted-foreground">
          Deep coverage across the conditions where a global view of expertise
          matters most.
        </p>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Cardiology</CardTitle>
              <CardDescription>
                Heart disease · Arrhythmia · Cardiac tumours · Congenital ·
                Structural heart · All ages
              </CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Oncology</CardTitle>
              <CardDescription>
                Solid tumours · Sarcoma · Blood cancers · Paediatric oncology ·
                Rare tumours · All ages
              </CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Orthopaedics &amp; MSK</CardTitle>
              <CardDescription>
                Bone tumours · Spine · Joints · Limb salvage · Sports injury ·
                All ages
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>

      {/* Care modes */}
      <section className="border-y bg-muted/20">
        <div className="mx-auto max-w-6xl px-4 py-16 md:py-24">
          <h2 className="text-center text-2xl font-semibold tracking-tight md:text-3xl">
            Four care modes
          </h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Remote second opinion</CardTitle>
                <CardDescription>
                  No jurisdiction constraint — expert review of your records and
                  imaging.
                </CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Telemedicine</CardTitle>
                <CardDescription>
                  Constrained by the doctor&apos;s license — live video consults
                  where regulations allow.
                </CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Medical travel</CardTitle>
                <CardDescription>
                  You travel to the specialist&apos;s hospital for in-person
                  care.
                </CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Fly the doctor</CardTitle>
                <CardDescription>
                  They travel to you — any country possible where agreements and
                  licensing permit.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* Showcase */}
      <section className="mx-auto max-w-6xl px-4 py-16 md:py-24">
        <h2 className="text-center text-2xl font-semibold tracking-tight md:text-3xl">
          Specialist quality
        </h2>
        <p className="mx-auto mt-2 max-w-2xl text-center text-muted-foreground">
          Examples of the calibre of experts on CareMatch Global. Rankings in the
          product are based on clinical fit only — never on who pays more.
        </p>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {showcaseSpecialists.map((s) => (
            <Card key={s.name}>
              <CardHeader>
                <CardTitle className="text-lg">{s.name}</CardTitle>
                <CardDescription>{s.title}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p>
                  <span className="font-medium text-foreground">Specialty:</span>{" "}
                  {s.specialty}
                </p>
                <p>
                  <span className="font-medium text-foreground">Institution:</span>{" "}
                  {s.institution}
                </p>
                <p>
                  <span className="font-medium text-foreground">Country:</span>{" "}
                  {s.country}
                </p>
                <p>
                  <span className="font-medium text-foreground">
                    Annual case volume:
                  </span>{" "}
                  {s.caseVolume}
                </p>
                <p>
                  <span className="font-medium text-foreground">Languages:</span>{" "}
                  {s.languages.join(", ")}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
        <p className="mt-8 text-center text-sm text-muted-foreground">
          Subscribe to see your personalised match score
        </p>
        <div className="mt-6 flex justify-center">
          <Button size="lg" asChild>
            <Link href="/signup">Find my specialist</Link>
          </Button>
        </div>
      </section>

      {/* How it works */}
      <section
        id="how-it-works"
        className="scroll-mt-20 border-y bg-muted/30"
      >
        <div className="mx-auto max-w-6xl px-4 py-16 md:py-24">
          <h2 className="text-center text-2xl font-semibold tracking-tight md:text-3xl">
            How it works
          </h2>
          <ol className="mx-auto mt-12 grid max-w-3xl gap-8">
            {[
              {
                n: "1",
                t: "Subscribe",
                d: "Choose your plan and activate your CareMatch Global account.",
              },
              {
                n: "2",
                t: "Describe your case",
                d: "Share your clinical situation, history, and urgency — the inputs we need for fit, not a personality quiz.",
              },
              {
                n: "3",
                t: "Get matched",
                d: "See globally ranked specialists by clinical fit — transparent criteria, no pay-to-rank.",
              },
              {
                n: "4",
                t: "Connect",
                d: "Reach out to your chosen specialist when you are ready to move forward.",
              },
            ].map((step) => (
              <li key={step.n} className="flex gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border bg-background text-sm font-semibold">
                  {step.n}
                </span>
                <div>
                  <h3 className="font-semibold">{step.t}</h3>
                  <p className="mt-1 text-muted-foreground">{step.d}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-4 py-16 md:py-24">
        <div className="rounded-2xl border bg-card px-6 py-12 text-center md:px-12">
          <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
            Ready to find your specialist?
          </h2>
          <div className="mt-8">
            <Button size="lg" asChild>
              <Link href="/signup">Get started</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
