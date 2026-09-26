/**
 * IMPORTANT NOTE: These Terms of Service outline Marlow Dental's scheduling,
 * cancellation, and financial policies. They require formal legal review and
 * finalization by qualified legal counsel prior to formal clinical deployment.
 */

import Link from "next/link";
import { ArrowLeft, Clock } from "lucide-react";
import SiteHeader from "@/components/layout/site-header";
import Footer from "@/components/layout/footer";

export const metadata = {
  title: "Terms of Service & Office Policies | Marlow Dental",
  description:
    "Clinical office policies, 48-hour cancellation notice requirements, financial terms, and patient responsibilities at Marlow Dental in Lincoln Park.",
};

export default function TermsPage() {
  return (
    <>
      <SiteHeader variant="minimal" />
      <main id="main-content" className="py-14 sm:py-20">
        <div className="container-x max-w-4xl space-y-10">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-ink-soft hover:text-forest transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Return to Home</span>
          </Link>

          <div>
            <p className="eyebrow mb-2">Practice Guidelines</p>
            <h1 className="text-[34px] sm:text-[44px] leading-tight text-ink font-normal">
              Terms of Service and Clinical Policies
            </h1>
            <p className="mt-2 text-xs text-ink-soft">
              Effective Date: January 1, 2024. Marlow Dental, P.C.
            </p>
          </div>

          <div className="rounded-[var(--radius-card)] border border-line bg-cream/50 p-6 shadow-card flex items-start gap-4">
            <Clock className="h-6 w-6 text-forest dark:text-emerald-400 shrink-0 mt-1" />
            <div className="text-xs sm:text-sm leading-relaxed text-ink-soft">
              <strong className="text-ink font-medium">Solo Doctor Practice Commitment:</strong> Because Dr. Sarah Marlow reserves her time exclusively for one patient per appointment slot with zero double-booking, our scheduling and cancellation policies are strictly observed to protect all patients&rsquo; access to timely care.
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
                Cancellations made with less than 48 hours notice or missed appointments without notification are subject to a $50 missed reservation fee, which cannot be billed to dental insurance.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="font-display text-xl sm:text-2xl text-ink font-medium">
                2. Transparent Financial Policy and Estimates
              </h2>
              <p>
                We believe in complete price transparency. Prior to commencing any non-emergency procedure, Marlow Dental provides an itemized written estimate detailing our cash fee and the estimated insurance benefit.
              </p>
              <ul className="list-disc pl-5 space-y-1 text-xs sm:text-sm">
                <li><strong>Insurance Claims:</strong> Dental insurance is an agreement between you, your employer, and your insurer. While we verify benefits and file claims as a courtesy, the patient remains responsible for any balance unpaid after 60 days.</li>
                <li><strong>Cash and Out-of-Pocket Payment:</strong> Co-payments, deductibles, and cash fees are due at the time clinical services are rendered. We accept all major credit cards, debit cards, cash, and CareCredit.</li>
                <li><strong>Pre-Payment Courtesy:</strong> A 5% bookkeeping adjustment is applied to restorative treatment plans over $500 when settled in full via cash or check on or before the treatment date.</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="font-display text-xl sm:text-2xl text-ink font-medium">
                3. Clinical Treatment Consents
              </h2>
              <p>
                Dr. Marlow discusses all treatment options, risks, benefits, and reasonable alternatives prior to starting any procedure. No treatment is performed without your informed verbal and written consent. You have the right to decline or defer any proposed procedure at any time.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="font-display text-xl sm:text-2xl text-ink font-medium">
                4. Emergency Care and Medical Disclaimer
              </h2>
              <p>
                The information provided on this website is for general educational purposes and does not constitute a doctor-patient relationship until an in-person clinical examination is performed by Dr. Sarah Marlow.
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
              <div className="rounded-[var(--radius-card)] border border-line bg-bone p-4 text-xs space-y-1 font-mono">
                <p>Marlow Dental, P.C.</p>
                <p>214 Alder Street, Suite 3, Chicago, IL 60614</p>
                <p>Office Telephone: (312) 555-0147</p>
              </div>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
