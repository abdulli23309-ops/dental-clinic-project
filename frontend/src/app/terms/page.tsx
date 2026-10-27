import Link from "next/link";
import { ArrowLeft, Clock, AlertTriangle } from "lucide-react";
import SiteHeader from "@/components/layout/site-header";
import Footer from "@/components/layout/footer";
import { LegalContactBox } from "@/components/layout/legal-contact-box";
import { AnimatedPage } from "@/components/ui/animated-page";
import { getUiCopy } from "@/content/ui-copy";

export const metadata = {
  title: "Terms of Service & Office Policies",
  description:
    "Clinical office policies, cancellation notice requirements, financial terms, and patient responsibilities.",
};

export default function TermsPage() {
  const copy = getUiCopy("en");

  return (
    <AnimatedPage>
      <>
        <SiteHeader variant="minimal" />
        <main id="main-content" className="py-12 md:py-20">
          <div className="container-x max-w-3xl">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs text-ink-soft hover:text-forest transition-colors mb-8"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>{copy.returnToHomepage}</span>
            </Link>

            <div className="border-b border-line pb-6 mb-8">
              <p className="eyebrow mb-1">Office Policies &amp; Agreement</p>
              <h1 className="fluid-h2 tracking-tight text-ink font-normal">
                Terms of Service
              </h1>
            </div>

            <div className="rounded-[var(--radius-card)] border border-amber-300 dark:border-amber-800 bg-amber-50/60 dark:bg-amber-950/30 p-4 text-xs text-amber-800 dark:text-amber-200 flex items-start gap-3 mb-8">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>
                <strong>Notice:</strong> These terms require formal legal review and finalization by qualified legal counsel prior to formal clinical deployment.
              </span>
            </div>

            <div className="rounded-[var(--radius-card)] border border-line bg-cream/50 p-6 shadow-card flex items-start gap-4 mb-8">
              <Clock className="h-6 w-6 text-forest dark:text-emerald-400 shrink-0 mt-1" />
              <div className="text-xs sm:text-sm leading-relaxed text-ink-soft">
                <strong className="text-ink font-medium">Dedicated Practitioner Scheduling:</strong> Because our clinicians reserve dedicated appointment blocks exclusively for one patient at a time, our scheduling and cancellation policies are observed to protect all patients&rsquo; access to timely care.
              </div>
            </div>

            <div className="space-y-8 text-sm sm:text-[15px] leading-[1.75] text-ink-soft">
              <section className="space-y-3">
                <h2 className="font-display text-xl sm:text-2xl text-ink font-medium">
                  1. Appointment Scheduling and Cancellation Notice
                </h2>
                <p>
                  When an appointment is scheduled, that operatory time is reserved exclusively for you. We kindly require advance notice if you need to reschedule or cancel a routine appointment.
                </p>
                <p>
                  Late cancellations without adequate notice may incur a cancellation fee. We recognize medical emergencies occur unpredictably, and our front desk evaluates those situations with compassion.
                </p>
              </section>

              <section className="space-y-3 border-t border-line/60 pt-6">
                <h2 className="font-display text-xl sm:text-2xl text-ink font-medium">
                  2. Transparent Pricing and Written Estimates
                </h2>
                <p>
                  Before undertaking any procedure, we provide you with an itemized written estimate detailing procedural fees according to our clinic fee schedule.
                </p>
                <p>
                  All fees and expected treatment phases are discussed upfront so that you have complete clarity prior to beginning treatment.
                </p>
              </section>

              <section className="space-y-3 border-t border-line/60 pt-6">
                <h2 className="font-display text-xl sm:text-2xl text-ink font-medium">
                  3. Payment Terms
                </h2>
                <p>
                  Payment for clinical services is due at the date of clinical service.
                </p>
              </section>

              <section className="space-y-3 border-t border-line/60 pt-6">
                <h2 className="font-display text-xl sm:text-2xl text-ink font-medium">
                  4. Emergency Care and Medical Disclaimer
                </h2>
                <p>
                  The information provided on this website is for general educational purposes and does not constitute a doctor-patient relationship until an in-person clinical examination is performed by an attending clinician.
                </p>
                <p>
                  If you are experiencing life-threatening symptoms, uncontrollable facial bleeding, or severe swelling compromising your airway, please contact local emergency medical services or report to the nearest hospital emergency department immediately.
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
    </AnimatedPage>
  );
}
