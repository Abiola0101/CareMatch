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
    matchScore: 97,
    initials: "EV",
    color: "bg-blue-100 text-blue-700",
  },
  {
    name: "Dr. James Okonkwo",
    title: "Surgical Oncology Lead",
    specialty: "Oncology",
    institution: "Lagos University Teaching Hospital",
    country: "Nigeria",
    caseVolume: 310,
    languages: ["English", "Igbo"],
    matchScore: 93,
    initials: "JO",
    color: "bg-green-100 text-green-700",
  },
  {
    name: "Dr. Mei Tanaka",
    title: "Orthopaedic Oncology",
    specialty: "Orthopaedics & MSK",
    institution: "Osaka National Hospital",
    country: "Japan",
    caseVolume: 280,
    languages: ["Japanese", "English"],
    matchScore: 91,
    initials: "MT",
    color: "bg-orange-100 text-orange-700",
  },
];

const specialtyBadgeColor: Record<string, string> = {
  Cardiology: "bg-blue-50 text-blue-700 border-blue-200",
  Oncology: "bg-green-50 text-green-700 border-green-200",
  "Orthopaedics & MSK": "bg-orange-50 text-orange-700 border-orange-200",
};

export default function MarketingHomePage() {
  return (
    <div>
      {/* Hero */}
      <section className="border-b bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-background">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:py-24 md:py-32">
          {/* Trust badge */}
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
            Ranking is based on clinical fit only
          </div>

          <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-slate-900 dark:text-slate-50 sm:text-5xl md:text-6xl">
            The best specialist for you may not be in your country
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-slate-600 dark:text-slate-400 sm:text-xl">
            CareMatch searches globally across cardiology, oncology, and
            orthopaedics. Every ranking is driven purely by clinical fit —
            no sponsored placement, no paid boosting.
          </p>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:gap-4">
            <Button size="lg" className="px-8 text-base shadow-sm" asChild>
              <Link href="/signup">Find my specialist</Link>
            </Button>
            <Button size="lg" variant="outline" className="text-base" asChild>
              <a href="#how-it-works">See how it works</a>
            </Button>
          </div>

          {/* Stat bar */}
          <div className="mt-12 flex flex-wrap items-center gap-x-8 gap-y-3 border-t pt-8">
            {[
              { label: "Specialties", value: "3" },
              { label: "Care modes", value: "4" },
              { label: "Network", value: "Global" },
              { label: "Ranking method", value: "Clinical-fit only" },
            ].map((stat) => (
              <div key={stat.label} className="flex flex-col">
                <span className="text-xl font-bold text-slate-900 dark:text-slate-50">
                  {stat.value}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {stat.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Three specialties */}
      <section className="mx-auto max-w-6xl px-4 py-16 md:py-24">
        <h2 className="text-center text-2xl font-semibold tracking-tight md:text-3xl">
          Three specialties
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-center text-muted-foreground">
          Deep coverage across the conditions where a global view of expertise
          matters most.
        </p>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {/* Cardiology */}
          <Card className="overflow-hidden border-l-4 border-l-blue-500">
            <CardHeader className="pb-3">
              <div className="mb-2 text-2xl">❤️</div>
              <CardTitle className="text-lg">Cardiology</CardTitle>
              <CardDescription>
                Heart disease · Arrhythmia · Cardiac tumours · Congenital ·
                Structural heart · All ages
              </CardDescription>
            </CardHeader>
          </Card>
          {/* Oncology */}
          <Card className="overflow-hidden border-l-4 border-l-green-500">
            <CardHeader className="pb-3">
              <div className="mb-2 text-2xl">🔬</div>
              <CardTitle className="text-lg">Oncology</CardTitle>
              <CardDescription>
                Solid tumours · Sarcoma · Blood cancers · Paediatric oncology ·
                Rare tumours · All ages
              </CardDescription>
            </CardHeader>
          </Card>
          {/* Orthopaedics */}
          <Card className="overflow-hidden border-l-4 border-l-orange-500">
            <CardHeader className="pb-3">
              <div className="mb-2 text-2xl">🦴</div>
              <CardTitle className="text-lg">Orthopaedics &amp; MSK</CardTitle>
              <CardDescription>
                Bone tumours · Spine · Joints · Limb salvage · Sports injury ·
                All ages
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>

      {/* Care modes */}
      <section className="border-y bg-slate-50 dark:bg-slate-950/50">
        <div className="mx-auto max-w-6xl px-4 py-16 md:py-24">
          <h2 className="text-center text-2xl font-semibold tracking-tight md:text-3xl">
            Four care modes
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-muted-foreground">
            Every patient situation is different. CareMatch supports the full
            spectrum of how care can be delivered.
          </p>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                icon: "💻",
                title: "Remote second opinion",
                desc: "No jurisdiction constraint — expert review of your records and imaging.",
                bestFor: "Best for: urgent expert review without travel",
              },
              {
                icon: "📱",
                title: "Telemedicine",
                desc: "Live video consults where regulations allow — constrained by the doctor's license.",
                bestFor: "Best for: ongoing remote consultation",
              },
              {
                icon: "✈️",
                title: "Medical travel",
                desc: "You travel to the specialist's hospital for in-person care.",
                bestFor: "Best for: procedures requiring specialist presence",
              },
              {
                icon: "🚑",
                title: "Fly the doctor",
                desc: "They travel to you — any country possible where licensing permits.",
                bestFor: "Best for: patients who cannot travel",
              },
            ].map((mode) => (
              <Card key={mode.title} className="flex flex-col">
                <CardHeader className="pb-2">
                  <div className="mb-2 text-2xl">{mode.icon}</div>
                  <CardTitle className="text-base">{mode.title}</CardTitle>
                  <CardDescription className="text-sm">
                    {mode.desc}
                  </CardDescription>
                </CardHeader>
                <CardContent className="mt-auto pt-0">
                  <p className="text-xs font-medium text-muted-foreground">
                    {mode.bestFor}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Showcase */}
      <section className="mx-auto max-w-6xl px-4 py-16 md:py-24">
        <h2 className="text-center text-2xl font-semibold tracking-tight md:text-3xl">
          Specialist quality
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-center text-muted-foreground">
          Examples of the calibre of experts on CareMatch Global. Rankings are
          based on clinical fit only.
        </p>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {showcaseSpecialists.map((s) => (
            <Card
              key={s.name}
              className="relative flex flex-col overflow-hidden"
            >
              {/* Match score badge */}
              <div className="absolute right-4 top-4 flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                {s.matchScore} match score
              </div>
              <CardHeader className="flex flex-row items-start gap-4 pb-3">
                {/* Avatar */}
                <div
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-sm font-bold ${s.color}`}
                >
                  {s.initials}
                </div>
                <div className="min-w-0">
                  <CardTitle className="text-base leading-snug">
                    {s.name}
                  </CardTitle>
                  <CardDescription className="mt-0.5 text-xs">
                    {s.title}
                  </CardDescription>
                  <span
                    className={`mt-1.5 inline-block rounded-full border px-2 py-0.5 text-[10px] font-semibold ${specialtyBadgeColor[s.specialty] ?? "bg-muted text-muted-foreground border-border"}`}
                  >
                    {s.specialty}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-1.5 text-sm text-muted-foreground">
                <p>
                  <span className="font-medium text-foreground">
                    Institution:
                  </span>{" "}
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
                  <span className="font-medium text-foreground">
                    Languages:
                  </span>{" "}
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
          <Button size="lg" className="px-8" asChild>
            <Link href="/signup">Find my specialist</Link>
          </Button>
        </div>
      </section>

      {/* How it works */}
      <section
        id="how-it-works"
        className="scroll-mt-20 border-y bg-slate-50 dark:bg-slate-950/50"
      >
        <div className="mx-auto max-w-6xl px-4 py-16 md:py-24">
          <h2 className="text-center text-2xl font-semibold tracking-tight md:text-3xl">
            How it works
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-center text-muted-foreground">
            From sign-up to specialist connection in four steps.
          </p>
          <ol className="mx-auto mt-14 max-w-2xl">
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
                d: "See globally ranked specialists by clinical fit — transparent criteria, clinical fit is the only ranking criteria.",
              },
              {
                n: "4",
                t: "Connect",
                d: "Reach out to your chosen specialist when you are ready to move forward.",
              },
            ].map((step, idx, arr) => (
              <li key={step.n} className="flex gap-5">
                <div className="flex flex-col items-center">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground shadow-sm">
                    {step.n}
                  </span>
                  {idx < arr.length - 1 && (
                    <div className="my-1 w-0.5 flex-1 bg-border" />
                  )}
                </div>
                <div className={idx < arr.length - 1 ? "pb-10" : "pb-0"}>
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
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 px-8 py-14 text-center text-white md:px-16 md:py-20">
          {/* Subtle background pattern */}
          <div className="pointer-events-none absolute inset-0 opacity-10">
            <div className="absolute left-1/4 top-0 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-400 blur-3xl" />
            <div className="absolute bottom-0 right-1/4 h-64 w-64 translate-x-1/2 translate-y-1/2 rounded-full bg-blue-600 blur-3xl" />
          </div>
          <div className="relative">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium text-white/80">
              Clinical fit is the only ranking criteria
            </div>
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
              Ready to find your specialist?
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-blue-100/80">
              Join thousands of patients who found expert care across borders
              through clinical-fit matching.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Button
                size="lg"
                className="bg-white px-8 text-slate-900 hover:bg-blue-50"
                asChild
              >
                <Link href="/signup">Get started</Link>
              </Button>
              <Button
                size="lg"
                variant="ghost"
                className="text-white hover:bg-white/10"
                asChild
              >
                <Link href="/pricing">View pricing</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
