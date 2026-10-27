import Link from "next/link";
import { ArrowLeft, CheckCircle2, AlertTriangle } from "lucide-react";
import SiteHeader from "@/components/layout/site-header";
import Footer from "@/components/layout/footer";
import { LegalContactBox } from "@/components/layout/legal-contact-box";
import { AnimatedPage } from "@/components/ui/animated-page";
import { getUiCopy } from "@/content/ui-copy";

export const metadata = {
  title: "Accessibility Statement",
  description:
    "Physical and digital accessibility accommodations and features.",
};

export default function AccessibilityPage() {
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
              <p className="eyebrow mb-2">Equal Access Commitment</p>
              <h1 className="text-[32px] sm:text-[42px] leading-tight text-ink font-normal">
                Accessibility Statement
              </h1>
            </div>

            <div className="rounded-[var(--radius-card)] border border-amber-300 dark:border-amber-800 bg-amber-50/60 dark:bg-amber-950/30 p-4 text-xs text-amber-800 dark:text-amber-200 flex items-start gap-3">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>
                <strong>Notice:</strong> This statement outlines physical and digital accessibility accommodations and requires periodic review against actual facility features.
              </span>
            </div>

            <div className="space-y-8 text-sm sm:text-[15px] leading-[1.75] text-ink-soft">
              <section className="space-y-3">
                <h2 className="font-display text-xl sm:text-2xl text-ink font-medium">
                  1. Physical Clinic Accommodations
                </h2>
                <p>
                  We believe healthcare should be easily accessible to all members of our community:
                </p>
                <ul className="space-y-2 text-xs sm:text-sm pt-1">
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="h-4 w-4 text-forest dark:text-emerald-400 shrink-0 mt-0.5" />
                    <span>
                      <strong>Level Entry:</strong> Clinical suites are designed for step-free access from the primary entrance.
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="h-4 w-4 text-forest dark:text-emerald-400 shrink-0 mt-0.5" />
                    <span>
                      <strong>Accessible Restrooms:</strong> Facilities accommodate mobility devices.
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="h-4 w-4 text-forest dark:text-emerald-400 shrink-0 mt-0.5" />
                    <span>
                      <strong>Wide Corridors:</strong> Hallways and operatories are designed for wheelchair clearance.
                    </span>
                  </li>
                </ul>
              </section>

              <section className="space-y-3 border-t border-line/60 pt-6">
                <h2 className="font-display text-xl sm:text-2xl text-ink font-medium">
                  2. Digital Web Accessibility
                </h2>
                <p>
                  Our digital experience is built adhering to WCAG 2.1 AA accessibility guidelines, including keyboard navigation, high text contrast, semantic landmarks, and screen reader labels.
                </p>
              </section>

              <section className="space-y-3 border-t border-line/60 pt-6">
                <h2 className="font-display text-xl sm:text-2xl text-ink font-medium">
                  3. Accessibility Coordinator
                </h2>
                <p>
                  If you require specific accommodation or encounter an accessibility barrier, please contact our coordinator:
                </p>
                <LegalContactBox officerTitle="Accessibility Coordinator" />
              </section>
            </div>
          </div>
        </main>
        <Footer />
      </>
    </AnimatedPage>
  );
}
