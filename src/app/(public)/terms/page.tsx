export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">Terms of Service</h1>
      <p className="mt-2 text-sm text-muted-foreground">Last updated: April 2026</p>

      <div className="mt-10 space-y-8 text-sm leading-relaxed text-foreground/80">
        <section className="space-y-3">
          <h2 className="text-base font-semibold text-foreground">1. Acceptance</h2>
          <p>
            By creating an account or using CareMatch Global (the "Platform"), you agree
            to these Terms of Service. If you do not agree, do not use the Platform.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-semibold text-foreground">2. What CareMatch Global does</h2>
          <p>
            CareMatch Global is a clinical specialist matching platform. We help patients
            identify and connect with specialist physicians worldwide based on clinical
            fit. We are not a medical provider, do not provide medical advice, and are not
            responsible for the clinical decisions made by any specialist or patient using
            the Platform.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-semibold text-foreground">3. Eligibility</h2>
          <p>
            You must be at least 18 years old to create an account. By signing up you
            confirm you are legally able to enter into this agreement. Specialists must
            hold valid medical credentials in the jurisdictions in which they practise.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-semibold text-foreground">4. Subscriptions and billing</h2>
          <p>
            Access to the Platform requires an active paid subscription. Subscriptions are
            billed monthly or annually and renew automatically. You may cancel at any time
            via the billing portal; cancellation takes effect at the end of the current
            billing period. Payments are processed by Stripe. Refunds are issued at our
            discretion.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-semibold text-foreground">5. Specialist responsibilities</h2>
          <ul className="ml-4 list-disc space-y-1">
            <li>Maintain accurate profile information including credentials and availability</li>
            <li>Respond to patient connection requests within 48 hours</li>
            <li>Not misrepresent qualifications, privileges, or experience</li>
            <li>Comply with applicable medical regulations in all relevant jurisdictions</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-semibold text-foreground">6. Patient responsibilities</h2>
          <ul className="ml-4 list-disc space-y-1">
            <li>Provide accurate clinical information when submitting cases</li>
            <li>Understand that a match is a referral suggestion, not a diagnosis or treatment plan</li>
            <li>Engage directly with specialists for all clinical decisions</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-semibold text-foreground">7. Prohibited conduct</h2>
          <p>You may not:</p>
          <ul className="ml-4 list-disc space-y-1">
            <li>Use the Platform to harass, defraud, or harm others</li>
            <li>Misrepresent your identity, credentials, or clinical case</li>
            <li>Attempt to circumvent the Platform to avoid subscription fees</li>
            <li>Scrape, reverse-engineer, or copy the Platform</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-semibold text-foreground">8. Limitation of liability</h2>
          <p>
            CareMatch Global provides a matching and communication platform only. We are
            not liable for the quality of clinical care provided by any specialist, for
            any medical outcomes, or for decisions made by patients or specialists in
            connection with a case. Our total liability to you in any circumstances is
            limited to the subscription fees paid by you in the three months preceding the
            claim.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-semibold text-foreground">9. Termination</h2>
          <p>
            We may suspend or terminate accounts that violate these Terms, at our
            discretion. You may close your account at any time by contacting us.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-semibold text-foreground">10. Changes to these terms</h2>
          <p>
            We may update these Terms from time to time. Continued use of the Platform
            after changes are posted constitutes acceptance of the revised Terms.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-semibold text-foreground">11. Contact</h2>
          <p>
            Questions?{" "}
            <a href="/contact" className="text-primary hover:underline">
              Contact us
            </a>{" "}
            or email{" "}
            <a href="mailto:hello@carematchglobal.com" className="text-primary hover:underline">
              hello@carematchglobal.com
            </a>.
          </p>
        </section>
      </div>
    </div>
  );
}
