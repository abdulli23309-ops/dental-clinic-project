/**
 * IMPORTANT NOTE: This HIPAA Notice document is a structured healthcare policy
 * template prepared for Marlow Dental. It requires formal review and finalization
 * by qualified healthcare legal counsel prior to formal clinical deployment.
 */

import Link from "next/link";
import { ArrowLeft, ShieldCheck, Lock, FileText, Phone } from "lucide-react";
import SiteHeader from "@/components/layout/site-header";
import Footer from "@/components/layout/footer";
import { LegalContactBox } from "@/components/layout/legal-contact-box";

export const metadata = {
  title: "HIPAA Notice of Privacy Practices | Marlow Dental",
  description:
    "Notice of privacy practices for protected health information under HIPAA regulations at Marlow Dental in Lincoln Park, Chicago.",
};

/**
 * Renders the formal HIPAA Notice of Privacy Practices.
 * It explains clinical duties regarding Protected Health Information (PHI), disclosure rules, and individual patient rights.
 */
export default function HipaaPage() {
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
            <p className="eyebrow mb-2">Protected Health Information</p>
            <h1 className="text-[32px] sm:text-[42px] leading-tight text-ink font-normal">
              HIPAA Notice of Privacy Practices
            </h1>
            <p className="mt-2 text-xs text-ink-soft">
              Marlow Dental, P.C. · Effective Date: January 1, 2024
            </p>
          </div>

          <div className="rounded-[var(--radius-card)] border border-line bg-cream/50 p-6 shadow-card flex items-start gap-4">
            <ShieldCheck className="h-6 w-6 text-forest dark:text-emerald-400 shrink-0 mt-1" />
            <div className="text-xs sm:text-sm leading-relaxed text-ink-soft">
              <strong className="text-ink font-medium">Your Health Information Rights:</strong> This notice describes how medical and dental information about you may be used and disclosed and how you can get access to this information. Please review it carefully.
            </div>
          </div>

          <div className="space-y-8 text-sm sm:text-[15px] leading-[1.75] text-ink-soft">
            <section className="space-y-3">
              <h2 className="font-display text-xl sm:text-2xl text-ink font-medium">
                1. Our Clinical Legal Duty
              </h2>
              <p>
                Marlow Dental is required by law to maintain the privacy of protected health information (PHI) and to provide you with notice of our legal duties and privacy practices with respect to PHI. We are obligated to abide by the terms of this Notice currently in effect.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="font-display text-xl sm:text-2xl text-ink font-medium">
                2. Uses and Disclosures of Health Information
              </h2>
              <p>
                We use and disclose health records for treatment, payment, and health care operations:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-xs sm:text-sm">
                <li>
                  <strong>Direct Clinical Treatment:</strong> Our licensed dentists and clinical personnel use your health history, dental radiographs, and periodontal measurements to plan and provide your care.
                </li>
                <li>
                  <strong>Payment Operations:</strong> We transmit your treatment codes and radiographs to your dental benefit plan to determine reimbursement and patient co-pay responsibility.
                </li>
                <li>
                  <strong>Specialist Coordination:</strong> With your consent, we confer with periodontists, endodontists, or oral surgeons when your case requires coordinated care.
                </li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="font-display text-xl sm:text-2xl text-ink font-medium">
                3. Your Rights Regarding Dental Records
              </h2>
              <p>
                You have the right to inspect and copy your dental records, including digital X-rays. Requests must be submitted in writing. We will provide your records within 30 days of receiving your written request in accordance with Illinois state dental board guidelines.
              </p>
            </section>

            <section className="space-y-3 border-t border-line/60 pt-6">
              <h2 className="font-display text-xl sm:text-2xl text-ink font-medium">
                4. Contacting Our Privacy Officer
              </h2>
              <p>
                If you have questions about our HIPAA policies or wish to file a formal inquiry, please contact our office:
              </p>
              <LegalContactBox officerTitle="Privacy Officer" />
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
