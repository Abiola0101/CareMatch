export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">Privacy Policy</h1>
      <p className="mt-2 text-sm text-muted-foreground">Last updated: April 2026</p>

      <div className="mt-10 space-y-8 text-sm leading-relaxed text-foreground/80">
        <section className="space-y-3">
          <h2 className="text-base font-semibold text-foreground">1. Who we are</h2>
          <p>
            CareMatch Global operates a clinical specialist matching platform that connects
            patients with specialist physicians worldwide. References to &ldquo;we&rdquo;, &ldquo;us&rdquo;, or
            &ldquo;our&rdquo; mean CareMatch Global and its operating entity.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-semibold text-foreground">2. Information we collect</h2>
          <p>We collect information you provide directly:</p>
          <ul className="ml-4 list-disc space-y-1">
            <li>Account details (name, email address, role)</li>
            <li>Patient profile data (date of birth, country, medical case details)</li>
            <li>Specialist profile data (credentials, specialties, availability)</li>
            <li>Payment information processed securely by Stripe</li>
            <li>Messages exchanged between patients and specialists</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-semibold text-foreground">3. How we use your information</h2>
          <ul className="ml-4 list-disc space-y-1">
            <li>To match patients with clinically appropriate specialists</li>
            <li>To process subscriptions and payments</li>
            <li>To send transactional emails (connection requests, responses, reminders)</li>
            <li>To improve matching accuracy and platform quality</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-semibold text-foreground">4. Data sharing</h2>
          <p>
            We do not sell your personal data. We share data only with:
          </p>
          <ul className="ml-4 list-disc space-y-1">
            <li>Supabase (database and authentication infrastructure)</li>
            <li>Stripe (payment processing)</li>
            <li>Resend (transactional email delivery)</li>
            <li>Matched specialists — only the clinical details relevant to your case</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-semibold text-foreground">5. Data retention</h2>
          <p>
            We retain your data for as long as your account is active. You may request
            deletion of your account and associated data at any time by contacting us at{" "}
            <a href="mailto:hello@carematchglobal.com" className="text-primary hover:underline">
              hello@carematchglobal.com
            </a>.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-semibold text-foreground">6. Security</h2>
          <p>
            All data is encrypted in transit (TLS) and at rest. Authentication is handled
            by Supabase, which implements industry-standard security practices. Payment
            data is never stored on our servers — it is processed entirely by Stripe.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-semibold text-foreground">7. Your rights</h2>
          <p>
            Depending on your jurisdiction you may have the right to access, correct,
            export, or delete your personal data. To exercise any of these rights, contact
            us at{" "}
            <a href="mailto:hello@carematchglobal.com" className="text-primary hover:underline">
              hello@carematchglobal.com
            </a>.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-semibold text-foreground">8. Changes to this policy</h2>
          <p>
            We may update this policy from time to time. Significant changes will be
            communicated by email to registered users.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-semibold text-foreground">9. Contact</h2>
          <p>
            Questions about this policy?{" "}
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
