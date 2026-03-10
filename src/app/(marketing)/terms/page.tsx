import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service | Cateros",
  description: "Terms of Service for the Cateros event operations platform.",
};

export default function TermsOfServicePage() {
  return (
    <main className="px-6 py-16 md:py-24">
      <div className="max-w-3xl mx-auto">
        <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight mb-2">
          Terms of Service
        </h1>
        <p className="text-sm text-[#7A8BA8] mb-12">Last updated: March 2026</p>

        <div className="space-y-10 text-[#C5CCDA] text-sm leading-relaxed">
          {/* 1 */}
          <section>
            <h2 className="text-lg font-semibold text-[#F4F1ED] mb-3">1. Introduction</h2>
            <p>
              Welcome to Cateros. These Terms of Service (&quot;Terms&quot;) govern your access to
              and use of the Cateros platform, website, and related services (collectively, the
              &quot;Service&quot;) operated by Cateros (&quot;we,&quot; &quot;us,&quot; or
              &quot;our&quot;). Cateros is an event operations platform designed for catering
              businesses and event professionals.
            </p>
            <p className="mt-3">
              By creating an account or using the Service, you agree to be bound by these Terms. If
              you do not agree, you may not access or use the Service.
            </p>
          </section>

          {/* 2 */}
          <section>
            <h2 className="text-lg font-semibold text-[#F4F1ED] mb-3">2. Account Registration</h2>
            <p>
              To use certain features of the Service, you must register for an account. When you
              register, you agree to provide accurate, current, and complete information and to keep
              that information up to date. You are responsible for safeguarding your account
              credentials and for all activity that occurs under your account. You must notify us
              immediately of any unauthorized use.
            </p>
            <p className="mt-3">
              You must be at least 18 years of age to create an account. By registering, you
              represent and warrant that you meet this requirement.
            </p>
          </section>

          {/* 3 */}
          <section>
            <h2 className="text-lg font-semibold text-[#F4F1ED] mb-3">3. Subscription Plans &amp; Payment</h2>
            <p>
              Cateros offers Free, Basic, and Pro subscription tiers. Paid subscriptions are billed
              on a recurring basis through our third-party payment processor, Stripe. By subscribing
              to a paid plan, you authorize us to charge the payment method on file for the
              applicable fees.
            </p>
            <ul className="list-disc pl-5 mt-3 space-y-1.5">
              <li>
                All fees are quoted in U.S. dollars unless otherwise stated and are non-refundable
                except as required by law.
              </li>
              <li>
                We may change pricing at any time, but will provide at least 30 days&apos; notice
                before any price increase takes effect on your next billing cycle.
              </li>
              <li>
                If payment fails, we may suspend or downgrade your account after a reasonable grace
                period.
              </li>
            </ul>
          </section>

          {/* 4 */}
          <section>
            <h2 className="text-lg font-semibold text-[#F4F1ED] mb-3">4. Acceptable Use</h2>
            <p>You agree not to:</p>
            <ul className="list-disc pl-5 mt-3 space-y-1.5">
              <li>Use the Service for any unlawful purpose or in violation of any applicable laws.</li>
              <li>Attempt to gain unauthorized access to the Service, other accounts, or our systems.</li>
              <li>Interfere with or disrupt the integrity or performance of the Service.</li>
              <li>Upload or transmit viruses, malware, or other harmful code.</li>
              <li>Reverse-engineer, decompile, or disassemble any part of the Service.</li>
              <li>Use the Service to send unsolicited communications (spam).</li>
              <li>Resell or redistribute the Service without our prior written consent.</li>
            </ul>
            <p className="mt-3">
              We reserve the right to suspend or terminate your account if we reasonably believe you
              have violated these terms.
            </p>
          </section>

          {/* 5 */}
          <section>
            <h2 className="text-lg font-semibold text-[#F4F1ED] mb-3">5. Your Data</h2>
            <p>
              You retain ownership of all content and data you submit to the Service, including
              event details, recipes, proposals, and business information (&quot;Your Data&quot;).
              By using the Service, you grant us a limited license to host, store, and process Your
              Data solely for the purpose of providing and improving the Service.
            </p>
            <p className="mt-3">
              We will not sell Your Data to third parties. Our handling of personal information is
              described in our Privacy Policy.
            </p>
          </section>

          {/* 6 */}
          <section>
            <h2 className="text-lg font-semibold text-[#F4F1ED] mb-3">6. Intellectual Property</h2>
            <p>
              The Service, including its design, logos, text, graphics, software, and all other
              content provided by Cateros (excluding Your Data), is owned by or licensed to us and
              is protected by copyright, trademark, and other intellectual property laws.
            </p>
            <p className="mt-3">
              We grant you a limited, non-exclusive, non-transferable, revocable license to access
              and use the Service for your internal business purposes in accordance with these
              Terms. This license does not include the right to modify, copy, distribute, or create
              derivative works of the Service.
            </p>
          </section>

          {/* 7 */}
          <section>
            <h2 className="text-lg font-semibold text-[#F4F1ED] mb-3">7. Termination</h2>
            <p>
              You may cancel your account at any time through your account settings. Upon
              cancellation of a paid subscription, you will retain access to paid features until the
              end of your current billing period.
            </p>
            <p className="mt-3">
              We may suspend or terminate your access to the Service at any time, with or without
              notice, for conduct that we believe violates these Terms, is harmful to other users or
              third parties, or is otherwise objectionable.
            </p>
            <p className="mt-3">
              Upon termination, your right to use the Service ceases immediately. We may delete Your
              Data after a reasonable retention period following termination, unless we are required
              by law to retain it.
            </p>
          </section>

          {/* 8 */}
          <section>
            <h2 className="text-lg font-semibold text-[#F4F1ED] mb-3">8. Disclaimer of Warranties</h2>
            <p>
              The Service is provided &quot;as is&quot; and &quot;as available&quot; without
              warranties of any kind, whether express or implied, including but not limited to
              implied warranties of merchantability, fitness for a particular purpose, and
              non-infringement. We do not warrant that the Service will be uninterrupted,
              error-free, or secure.
            </p>
          </section>

          {/* 9 */}
          <section>
            <h2 className="text-lg font-semibold text-[#F4F1ED] mb-3">9. Limitation of Liability</h2>
            <p>
              To the maximum extent permitted by applicable law, Cateros and its officers,
              directors, employees, and agents shall not be liable for any indirect, incidental,
              special, consequential, or punitive damages, or any loss of profits, revenue, data,
              or business opportunities arising out of or related to your use of the Service.
            </p>
            <p className="mt-3">
              Our total aggregate liability for any claims arising from or related to these Terms or
              the Service shall not exceed the greater of (a) the amount you paid us in the twelve
              (12) months preceding the claim, or (b) one hundred U.S. dollars ($100).
            </p>
          </section>

          {/* 10 */}
          <section>
            <h2 className="text-lg font-semibold text-[#F4F1ED] mb-3">10. Indemnification</h2>
            <p>
              You agree to indemnify, defend, and hold harmless Cateros and its affiliates from and
              against any claims, damages, losses, liabilities, costs, and expenses (including
              reasonable attorneys&apos; fees) arising out of or related to your use of the Service,
              your violation of these Terms, or your violation of any rights of a third party.
            </p>
          </section>

          {/* 11 */}
          <section>
            <h2 className="text-lg font-semibold text-[#F4F1ED] mb-3">11. Changes to These Terms</h2>
            <p>
              We may update these Terms from time to time. If we make material changes, we will
              notify you by email or by posting a notice on the Service at least 30 days before the
              changes take effect. Your continued use of the Service after the effective date
              constitutes your acceptance of the revised Terms.
            </p>
          </section>

          {/* 12 */}
          <section>
            <h2 className="text-lg font-semibold text-[#F4F1ED] mb-3">12. Governing Law</h2>
            <p>
              These Terms shall be governed by and construed in accordance with the laws of the
              State of Delaware, United States, without regard to its conflict-of-law principles.
              Any disputes arising from these Terms or the Service shall be resolved exclusively in
              the state or federal courts located in Delaware.
            </p>
          </section>

          {/* 13 */}
          <section>
            <h2 className="text-lg font-semibold text-[#F4F1ED] mb-3">13. Contact Us</h2>
            <p>
              If you have any questions about these Terms, please contact us at{" "}
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
