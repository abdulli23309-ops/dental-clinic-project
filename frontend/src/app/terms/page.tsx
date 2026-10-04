/**
 * IMPORTANT NOTE: These Terms of Service outline the practice's scheduling,
 * cancellation, and financial policies. They require formal legal review and
 * finalization by qualified legal counsel prior to formal clinical deployment.
 */

import Link from "next/link";
import { ArrowLeft, Clock } from "lucide-react";
import SiteHeader from "@/components/layout/site-header";
import Footer from "@/components/layout/footer";
import { LegalContactBox } from "@/components/layout/legal-contact-box";

export const metadata = {
  title: "Terms of Service & Office Policies | Marlow Dental",
  description:
    "Clinical office policies, 48-hour cancellation notice requirements, financial terms, and patient responsibilities at Marlow Dental in Lincoln Park.",
};

/**
 * Renders the Terms of Service and Clinical Policies page.
 * It explains appointment scheduling, the 48-hour cancellation policy, and financial terms.
 */
export default function TermsPage() {
  return (
    <>
      <SiteHeader variant="minimal" />
      <main id="main-content" className="py-12 md:py-20">
        <div className="container-x max-w-3xl">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-ink-soft hover:text-forest transition-colors mb-8"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Return to Homepage</span>
          </Link>

          <div className="border-b border-line pb-6 mb-8">
            <p className="eyebrow mb-1">Office Policies &amp; Agreement</p>
            <h1 className="fluid-h2 tracking-tight text-ink font-normal">
              Terms of Service
            </h1>
            <p className="mt-2 text-xs text-ink-soft">
              Effective Date: January 1, 2024. Office Administration.
            </p>
          </div>

          <div className="rounded-[var(--radius-card)] border border-line bg-cream/50 p-6 shadow-card flex items-start gap-4 mb-8">
            <Clock className="h-6 w-6 text-forest dark:text-emerald-400 shrink-0 mt-1" />
            <div className="text-xs sm:text-sm leading-relaxed text-ink-soft">
              <strong className="text-ink font-medium">Dedicated Practitioner Scheduling Commitment:</strong> Because our clinicians reserve dedicated appointment blocks exclusively for one patient at a time with zero double-booking, our scheduling and cancellation policies are strictly observed to protect all patients&rsquo; access to timely care.
            </div>
          </div>

          <div className="space-y-8 text-sm sm:text-[15px] leading-[1.75] text-ink-soft">
            <section className="space-y-3">
              <h2 className="font-display text-xl sm:text-2xl text-ink font-medium">
                1. Appointment Scheduling and 48-Hour Cancellation Notice
              </h2>
              <p>
                When an appointment is scheduled, that operatory time is reserved exclusively for you. We kindly require at least <strong>48 business hours advance notice</strong> if you need to reschedule or cancel a routine appointment.
              </p>
              <p>
                Late cancellations (under 48 hours) or missed appointments without notice may incur a <strong>$75 scheduling fee</strong>. We recognize medical emergencies and severe illness occur unpredictably, and our front desk evaluates those situations with compassion.
              </p>
            </section>

            <section className="space-y-3 border-t border-line/60 pt-6">
              <h2 className="font-display text-xl sm:text-2xl text-ink font-medium">
                2. Transparent Pricing and Written Estimates
              </h2>
              <p>
                Before undertaking any procedure outside routine preventive cleanings, we provide you with a written, itemized estimate detailing procedural CDT codes, office fees, and estimated insurance copays.
              </p>
              <p>
                Insurance coverage estimates are derived from verified benefits tables provided by your insurance carrier; however, your carrier makes the final adjudication upon claim processing. You remain financially responsible for any remaining balance not covered by insurance.
              </p>
            </section>

            <section className="space-y-3 border-t border-line/60 pt-6">
              <h2 className="font-display text-xl sm:text-2xl text-ink font-medium">
                3. Payment Terms and Financing
              </h2>
              <p>
                Patient copayments, coinsurance, and non-covered procedure balances are due at the date of clinical service. We accept major credit cards (Visa, MasterCard, American Express, Discover), debit cards, and cash.
              </p>
              <p>
                For balances exceeding $500, zero-interest 6-month financing is available upon approval through CareCredit. We also extend a 5% bookkeeping adjustment for balances settled in full via cash or check on the date of clinical treatment.
              </p>
            </section>

            <section className="space-y-3 border-t border-line/60 pt-6">
              <h2 className="font-display text-xl sm:text-2xl text-ink font-medium">
                4. Emergency Care and Medical Disclaimer
              </h2>
              <p>
                The information provided on this website is for general educational purposes and does not constitute a doctor-patient relationship until an in-person clinical examination is performed by a licensed practitioner at our practice.
              </p>
              <p>
                If you are experiencing life-threatening symptoms, uncontrollable facial bleeding, or severe swelling compromising your airway, please call <strong>911</strong> or report to the nearest hospital emergency room immediately.
              </p>
            </section>

            <section className="space-y-3 border-t border-line/60 pt-6">
              <h2 className="font-display text-xl sm:text-2xl text-ink font-medium">
                5. Questions Regarding Office Policies
              </h2>
              <p>
                If you have questions regarding our scheduling policies, financial estimates, or treatment plans, our front desk team is happy to assist:
              </p>
              <LegalContactBox officerTitle="Office Administration" />
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
