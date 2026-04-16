import type { Metadata } from "next";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = {
  title: "About — CareMatch Global",
  description:
    "How CareMatch matches patients to specialists globally using clinical fit only.",
};

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 md:py-20">
      <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
        About CareMatch Global
      </h1>
      <p className="mt-4 text-lg text-muted-foreground">
        CareMatch Global connects patients with specialists across borders in
        cardiology, oncology, and orthopaedics &amp; MSK — because the best
        clinical fit may not be in your country.
      </p>

      <section className="mt-12 space-y-4">
        <h2 className="text-xl font-semibold">How matching works</h2>
        <p className="text-muted-foreground">
          Matching is based on <strong className="text-foreground">clinical fit</strong>{" "}
          — diagnosis, complexity, experience with similar cases, languages,
          geography where relevant, and care mode (e.g. second opinion vs medical
          travel). There is no personality quiz and no “lifestyle” scoring.
        </p>
      </section>

      <section className="mt-10 space-y-4">
        <h2 className="text-xl font-semibold">Trust model</h2>
        <p className="text-muted-foreground">
          <strong className="text-foreground">Ranking is never influenced by payment.</strong>{" "}
          Specialists cannot pay to appear higher in your match list. Subscription
          covers access to the platform and workflows; it does not buy placement
          in clinical rankings.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="mb-4 text-xl font-semibold">Team</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Co-founder</CardTitle>
              <CardDescription>Bio coming soon</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Placeholder for founder story and background.
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Co-founder</CardTitle>
              <CardDescription>Bio coming soon</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Placeholder for founder story and background.
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
