import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | Cateros",
  description: "Privacy Policy for the Cateros event operations platform.",
};

export default function PrivacyPolicyPage() {
  return (
    <main className="px-6 py-16 md:py-24">
      <div className="max-w-3xl mx-auto">
        <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight mb-2">
          Privacy Policy
        </h1>
        <p className="text-sm text-[#7A8BA8] mb-12">Last updated: March 2026</p>

        <div className="space-y-10 text-[#C5CCDA] text-sm leading-relaxed">
          {/* 1 */}
          <section>
            <h2 className="text-lg font-semibold text-[#F4F1ED] mb-3">1. Introduction</h2>
            <p>
              Cateros (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) operates the Cateros
              platform, an event operations platform for catering businesses and event professionals.
              This Privacy Policy explains how we collect, use, disclose, and protect your personal
              information when you use our website and services (collectively, the
              &quot;Service&quot;).
            </p>
            <p className="mt-3">
              By using the Service, you agree to the collection and use of information in accordance
              with this policy. If you do not agree, please do not use the Service.
            </p>
          </section>

          {/* 2 */}
          <section>
            <h2 className="text-lg font-semibold text-[#F4F1ED] mb-3">2. Information We Collect</h2>

            <h3 className="text-sm font-semibold text-[#F4F1ED] mt-4 mb-2">
              2.1 Account Information
            </h3>
            <p>
              When you register for an account, we collect your name, email address, and password.
              You may also provide optional business information such as your company name, phone
              number, and branding details.
            </p>

            <h3 className="text-sm font-semibold text-[#F4F1ED] mt-4 mb-2">
              2.2 Event &amp; Business Data
            </h3>
            <p>
              We collect information you enter into the platform, including event details, guest
              counts, recipes, proposals, schedules, and other operational data related to your
              catering business.
            </p>

            <h3 className="text-sm font-semibold text-[#F4F1ED] mt-4 mb-2">
              2.3 Payment Information
            </h3>
            <p>
              Payment processing is handled by Stripe. We do not store your full credit card number
              or payment credentials on our servers. Stripe may collect and store payment
              information in accordance with their own privacy policy.
            </p>

            <h3 className="text-sm font-semibold text-[#F4F1ED] mt-4 mb-2">
              2.4 Usage &amp; Technical Data
            </h3>
            <p>
              We automatically collect certain technical information when you use the Service,
              including your IP address, browser type, operating system, device information, pages
              visited, and referring URLs. This data helps us improve the Service and diagnose
              technical issues.
            </p>
          </section>

          {/* 3 */}
          <section>
            <h2 className="text-lg font-semibold text-[#F4F1ED] mb-3">3. How We Use Your Information</h2>
            <p>We use the information we collect to:</p>
            <ul className="list-disc pl-5 mt-3 space-y-1.5">
              <li>Provide, operate, and maintain the Service.</li>
              <li>Process transactions and manage your subscription.</li>
              <li>Send you account-related communications, including billing and support emails.</li>
              <li>Improve the Service, including developing new features and fixing bugs.</li>
              <li>Monitor usage patterns and analyze trends to enhance user experience.</li>
              <li>Enforce our Terms of Service and protect against fraud or abuse.</li>
              <li>Comply with legal obligations.</li>
            </ul>
            <p className="mt-3">
              We do not sell your personal information to third parties. We do not use your event or
              business data for advertising purposes.
            </p>
          </section>

          {/* 4 */}
          <section>
            <h2 className="text-lg font-semibold text-[#F4F1ED] mb-3">4. Third-Party Services</h2>
            <p>
              We use the following third-party services to operate the platform. Each service has
              its own privacy policy governing how it handles your data:
            </p>
            <ul className="list-disc pl-5 mt-3 space-y-1.5">
              <li>
                <strong className="text-[#F4F1ED]">Supabase</strong> — Database hosting,
                authentication, and backend services.
              </li>
              <li>
                <strong className="text-[#F4F1ED]">Stripe</strong> — Payment processing and
                subscription billing.
              </li>
              <li>
                <strong className="text-[#F4F1ED]">Vercel</strong> — Application hosting and
                deployment.
              </li>
              <li>
                <strong className="text-[#F4F1ED]">Resend</strong> — Transactional email delivery.
              </li>
            </ul>
            <p className="mt-3">
              We only share the minimum amount of data necessary for these services to function. We
              do not share your data with third parties for their own marketing purposes.
            </p>
          </section>

          {/* 5 */}
          <section>
            <h2 className="text-lg font-semibold text-[#F4F1ED] mb-3">5. Cookies &amp; Tracking</h2>
            <p>
              We use cookies and similar technologies to maintain your session, remember your
              preferences, and understand how you use the Service. These include:
            </p>
            <ul className="list-disc pl-5 mt-3 space-y-1.5">
              <li>
                <strong className="text-[#F4F1ED]">Essential cookies</strong> — Required for
                authentication and core functionality.
              </li>
              <li>
                <strong className="text-[#F4F1ED]">Analytics cookies</strong> — Help us understand
                usage patterns and improve the Service.
              </li>
            </ul>
            <p className="mt-3">
              You can configure your browser to refuse cookies, but some features of the Service may
              not function properly without them.
            </p>
          </section>

          {/* 6 */}
          <section>
            <h2 className="text-lg font-semibold text-[#F4F1ED] mb-3">6. Data Retention</h2>
            <p>
              We retain your account information and business data for as long as your account is
              active or as needed to provide the Service. If you delete your account, we will remove
              your personal information and business data within 30 days, unless we are required by
              law to retain it for a longer period.
            </p>
            <p className="mt-3">
              Aggregated, anonymized data that cannot be used to identify you may be retained
              indefinitely for analytical purposes.
            </p>
          </section>

          {/* 7 */}
          <section>
            <h2 className="text-lg font-semibold text-[#F4F1ED] mb-3">7. Your Rights</h2>
            <p>Depending on your jurisdiction, you may have the right to:</p>
            <ul className="list-disc pl-5 mt-3 space-y-1.5">
              <li>
                <strong className="text-[#F4F1ED]">Access</strong> — Request a copy of the personal
                data we hold about you.
              </li>
              <li>
                <strong className="text-[#F4F1ED]">Correction</strong> — Request correction of
                inaccurate or incomplete data.
              </li>
              <li>
                <strong className="text-[#F4F1ED]">Deletion</strong> — Request deletion of your
                personal data, subject to legal obligations.
              </li>
              <li>
                <strong className="text-[#F4F1ED]">Portability</strong> — Request your data in a
                structured, machine-readable format.
              </li>
              <li>
                <strong className="text-[#F4F1ED]">Objection</strong> — Object to certain
                processing of your personal data.
              </li>
            </ul>
            <p className="mt-3">
              To exercise any of these rights, please contact us at{" "}
              <a
                href="mailto:support@cateros.com"
                className="text-[#D4A373] hover:text-[#F4F1ED] transition-colors underline"
              >
                support@cateros.com
              </a>
              . We will respond to your request within 30 days.
            </p>
          </section>

          {/* 8 */}
          <section>
            <h2 className="text-lg font-semibold text-[#F4F1ED] mb-3">8. Security</h2>
            <p>
              We take reasonable technical and organizational measures to protect your data,
              including encryption in transit (TLS/SSL), encryption at rest, secure authentication
              via Supabase Auth, and regular security reviews. However, no method of transmission or
              storage is completely secure, and we cannot guarantee absolute security.
            </p>
          </section>

          {/* 9 */}
          <section>
            <h2 className="text-lg font-semibold text-[#F4F1ED] mb-3">9. Children&apos;s Privacy</h2>
            <p>
              The Service is not directed to individuals under the age of 18. We do not knowingly
              collect personal information from children. If you believe we have inadvertently
              collected such information, please contact us so we can promptly delete it.
            </p>
          </section>

          {/* 10 */}
          <section>
            <h2 className="text-lg font-semibold text-[#F4F1ED] mb-3">10. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. If we make material changes, we
              will notify you by email or by posting a notice on the Service at least 30 days before
              the changes take effect. Your continued use of the Service after the effective date
              constitutes your acceptance of the updated policy.
            </p>
          </section>

          {/* 11 */}
          <section>
            <h2 className="text-lg font-semibold text-[#F4F1ED] mb-3">11. Contact Us</h2>
            <p>
              If you have any questions or concerns about this Privacy Policy or our data practices,
              please contact us at{" "}
              <a
                href="mailto:support@cateros.com"
                className="text-[#D4A373] hover:text-[#F4F1ED] transition-colors underline"
              >
                support@cateros.com
              </a>
              .
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
