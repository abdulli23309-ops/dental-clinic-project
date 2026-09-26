import Link from "next/link";
import { ArrowLeft, Calendar, Compass } from "lucide-react";
import SiteHeader from "@/components/layout/site-header";
import Footer from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export const metadata = {
  title: "Page Not Found | Marlow Dental",
  description: "The page you requested could not be located. Explore Marlow Dental services or return home.",
};

export default function NotFound() {
  return (
    <>
      <SiteHeader variant="minimal" />
      <main id="main-content" className="py-20 sm:py-28 text-center">
        <div className="container-x max-w-xl space-y-6">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-cream border border-line text-forest dark:text-emerald-400">
            <Compass className="h-7 w-7" />
          </div>

          <p className="eyebrow">Error 404</p>

          <h1 className="text-[34px] sm:text-[44px] leading-tight text-ink font-normal">
            We could not locate that page.
          </h1>

          <p className="text-sm sm:text-base leading-relaxed text-ink-soft">
            The link you followed may be outdated or the page may have moved. Here are the most helpful destinations:
          </p>

          <div className="pt-2 flex flex-col sm:flex-row justify-center gap-3">
            <Button href="/" variant="primary" size="md">
              <ArrowLeft className="h-4 w-4" />
              <span>Return to Homepage</span>
            </Button>
            <Button href="/#services" variant="secondary" size="md">
              <span>View Treatment Fees</span>
            </Button>
            <Button href="/book" variant="outline" size="md">
              <Calendar className="h-4 w-4 text-forest" />
              <span>Book Appointment</span>
            </Button>
          </div>

          <Card surface="cream" shadow="subtle" className="mt-12 p-6 text-xs text-ink-soft space-y-2">
            <p className="font-semibold text-ink uppercase tracking-wider text-[11px]">
              Need Immediate Assistance?
            </p>
            <p>
              If you are looking for office hours or emergency dental care, please call our Lincoln Park desk directly at{" "}
              <a href="tel:+13125550147" className="text-forest dark:text-emerald-400 font-semibold underline">
                (312) 555-0147
              </a>.
            </p>
          </Card>
        </div>
      </main>
      <Footer />
    </>
  );
}
