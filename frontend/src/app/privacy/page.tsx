/**
 * IMPORTANT NOTE: This Privacy Policy outlines Marlow Dental's data handling
 * and patient privacy practices. It requires formal legal review and finalization
 * by qualified healthcare legal counsel prior to formal clinical deployment.
 */

import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import SiteHeader from "@/components/layout/site-header";
import Footer from "@/components/layout/footer";

export const metadata = {
  title: "Privacy Policy | Marlow Dental",
  description:
    "Patient health information privacy practices, electronic health records security, and HIPAA compliance policies at Marlow Dental in Lincoln Park, Chicago.",
};

/**
 * Renders the practice's Privacy Policy page.
 * It details patient rights, collection of protected health information, data security measures, and privacy inquiries.
 */
export default function PrivacyPage() {
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
            <p className="eyebrow mb-2">Patient Rights and Regulatory Compliance</p>
            <h1 className="text-[34px] sm:text-[44px] leading-tight text-ink font-normal">
              Privacy Policy and Notice of HIPAA Privacy Practices
            </h1>
            <p className="mt-2 text-xs text-ink-soft">
              Effective Date: January 1, 2024. Last Reviewed: September 2026.
            </p>
          </div>

          <div className="rounded-[var(--radius-card)] border border-line bg-cream/50 p-6 shadow-card flex items-start gap-4">
            <ShieldCheck className="h-6 w-6 text-forest dark:text-emerald-400 shrink-0 mt-1" />
            <div className="text-xs sm:text-sm leading-relaxed text-ink-soft">
              <strong className="text-ink font-medium">Your Health Information Rights:</strong> This notice describes how medical and dental information about you may be used and disclosed and how you can get access to this information under the Health Insurance Portability and Accountability Act (HIPAA).
            </div>
          </div>

          <div className="space-y-8 text-sm sm:text-[15px] leading-[1.75] text-ink-soft">
            <section className="space-y-3">
              <h2 className="font-display text-xl sm:text-2xl text-ink font-medium">
                1. Information We Collect
              </h2>
              <p>
                When you schedule a consultation, visit our Lincoln Park office, or submit an appointment request, Marlow Dental collects Protected Health Information (PHI) necessary for proper diagnosis and clinical care, including:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-xs sm:text-sm">
                <li>Contact details: Legal name, date of birth, telephone, physical address, and email.</li>
                <li>Clinical history: Dental and medical history, current prescriptions, allergies, and diagnostic imaging (digital radiographs, 3D scans).</li>
                <li>Financial details: Dental insurance policy information, claim records, and payment receipts.</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="font-display text-xl sm:text-2xl text-ink font-medium">
                2. How We Use and Disclose Health Information
              </h2>
              <p>
                We disclose your health records solely for treatment, payment, and health care operations:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-xs sm:text-sm">
                <li><strong>Clinical Treatment:</strong> Dr. Sarah Marlow and authorized clinical staff review your records to diagnose and administer dental care. If you require specialty endodontic or oral surgical care, Dr. Marlow directly transfers your records to the licensed specialist.</li>
                <li><strong>Insurance Claims and Payment:</strong> We transmit diagnostic codes (CDT codes) and radiographs to your dental insurance provider to process claims and confirm benefits.</li>
                <li><strong>Legal Requirements:</strong> Disclosures mandated by federal, state, or municipal public health authorities in Illinois.</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="font-display text-xl sm:text-2xl text-ink font-medium">
                3. We Never Sell or Commercialize Patient Data
              </h2>
              <p>
                Marlow Dental will never sell, rent, or trade your personal or health data to third-party data brokers, pharmaceutical marketers, or advertising platforms. Website cookies are limited to functional session state and essential appointment progress tracking.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="font-display text-xl sm:text-2xl text-ink font-medium">
                4. Your Individual Rights
              </h2>
              <p>
                Under Illinois law and HIPAA regulations, you retain the right to:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-xs sm:text-sm">
                <li>Inspect and receive an electronic or paper copy of your complete dental record and radiographs.</li>
                <li>Request written amendments to any inaccurate clinical record.</li>
                <li>Request confidential communication channels (such as calling only a specific mobile phone).</li>
                <li>Obtain an accounting of non-routine disclosures made by our office.</li>
              </ul>
            </section>

            <section className="space-y-3 border-t border-line/60 pt-6">
              <h2 className="font-display text-xl sm:text-2xl text-ink font-medium">
                5. Privacy Officer and Records Requests
              </h2>
              <p>
                To request your dental records or submit an inquiry regarding privacy practices, please contact our Lincoln Park office:
              </p>
              <div className="rounded-[var(--radius-card)] border border-line bg-bone p-4 text-xs space-y-1.5 font-mono">
                <p>Marlow Dental, P.C. Privacy Officer</p>
                <p>214 Alder Street, Suite 3, Chicago, IL 60614</p>
                <p>Phone: (312) 555-0147. Email: privacy@marlowdental.com</p>
              </div>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
