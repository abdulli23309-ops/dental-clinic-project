import Link from "next/link";
import { ArrowLeft, ShieldCheck, AlertTriangle } from "lucide-react";
import SiteHeader from "@/components/layout/site-header";
import Footer from "@/components/layout/footer";
import { LegalContactBox } from "@/components/layout/legal-contact-box";
import { AnimatedPage } from "@/components/ui/animated-page";
import { getUiCopy } from "@/content/ui-copy";

export const metadata = {
  title: "Privacy Policy",
  description: "Patient health information privacy practices and patient records security policies.",
};

export default function PrivacyPage() {
  const copy = getUiCopy("en");

  return (
    <AnimatedPage>
      <>
        <SiteHeader variant="minimal" />
        <main id="main-content" className="py-14 sm:py-20">
          <div className="container-x max-w-4xl space-y-10">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-ink-soft hover:text-forest transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>{copy.returnToHomepage}</span>
            </Link>

            <div>
              <p className="eyebrow mb-2">Patient Rights and Privacy</p>
              <h1 className="text-[34px] sm:text-[44px] leading-tight text-ink font-normal">
                Privacy Policy and Patient Data Notice
              </h1>
            </div>

            <div className="rounded-[var(--radius-card)] border border-amber-300 dark:border-amber-800 bg-amber-50/60 dark:bg-amber-950/30 p-4 text-xs text-amber-800 dark:text-amber-200 flex items-start gap-3">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>
                <strong>Notice:</strong> This policy requires formal legal review and finalization by qualified healthcare legal counsel prior to formal clinical deployment.
              </span>
            </div>

            <div className="rounded-[var(--radius-card)] border border-line bg-cream/50 p-6 shadow-card flex items-start gap-4">
              <ShieldCheck className="h-6 w-6 text-forest dark:text-emerald-400 shrink-0 mt-1" />
              <div className="text-xs sm:text-sm leading-relaxed text-ink-soft">
                <strong className="text-ink font-medium">Your Health Information Rights:</strong> This notice describes how medical and dental information about you is maintained, protected, and kept strictly confidential by our clinical and front-office team.
              </div>
            </div>

            <div className="space-y-8 text-sm sm:text-[15px] leading-[1.75] text-ink-soft">
              <section className="space-y-3">
                <h2 className="font-display text-xl sm:text-2xl text-ink font-medium">
                  1. Information We Collect
                </h2>
                <p>
                  When you schedule a consultation, visit the clinic, or submit an appointment request, our practice collects information necessary for clinical assessment, diagnosis, and care coordination, including:
                </p>
                <ul className="list-disc pl-5 space-y-1 text-xs sm:text-sm">
                  <li>Contact details: Legal name, date of birth, telephone, physical address, and email.</li>
                  <li>Clinical history: Dental and medical history, current prescriptions, allergies, and diagnostic imaging.</li>
                  <li>Billing records: Treatment records and payment receipts.</li>
                </ul>
              </section>

              <section className="space-y-3">
                <h2 className="font-display text-xl sm:text-2xl text-ink font-medium">
                  2. How We Use and Disclose Health Information
                </h2>
                <p>
                  We use your health records solely for treatment planning, delivery of clinical care, and practice operations:
                </p>
                <ul className="list-disc pl-5 space-y-1 text-xs sm:text-sm">
                  <li><strong>Clinical Treatment:</strong> Attending clinicians and clinical staff review your records to diagnose and administer dental care. If you require specialist referral, records are transferred only with your authorization.</li>
                  <li><strong>Patient Accounts:</strong> Payment and account reconciliation for clinical services rendered.</li>
                  <li><strong>Legal Compliance:</strong> Disclosures mandated by competent health and regulatory authorities.</li>
                </ul>
              </section>

              <section className="space-y-3">
                <h2 className="font-display text-xl sm:text-2xl text-ink font-medium">
                  3. We Never Sell or Commercialize Patient Data
                </h2>
                <p>
                  Our clinic will never sell, rent, or trade your personal or health data to third-party data brokers, marketers, or advertising platforms. Website cookies are limited to functional session state and essential appointment progress tracking.
                </p>
              </section>

              <section className="space-y-3">
                <h2 className="font-display text-xl sm:text-2xl text-ink font-medium">
                  4. Your Individual Rights
                </h2>
                <p>
                  As a patient, you retain the right to:
                </p>
                <ul className="list-disc pl-5 space-y-1 text-xs sm:text-sm">
                  <li>Inspect and receive an electronic or paper copy of your complete dental record and radiographs.</li>
                  <li>Request written corrections to any inaccurate clinical record.</li>
                  <li>Request confidential communication channels.</li>
                  <li>Obtain an accounting of non-routine disclosures made by our office.</li>
                </ul>
              </section>

              <section className="space-y-3 border-t border-line/60 pt-6">
                <h2 className="font-display text-xl sm:text-2xl text-ink font-medium">
                  5. Privacy Inquiries
                </h2>
                <p>
                  To request your dental records or submit an inquiry regarding privacy practices, please contact our office:
                </p>
                <LegalContactBox officerTitle="Privacy Officer" />
              </section>
            </div>
          </div>
        </main>
        <Footer />
      </>
    </AnimatedPage>
  );
}
