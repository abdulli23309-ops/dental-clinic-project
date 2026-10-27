"use client";

import SiteHeader from "@/components/layout/site-header";
import Footer from "@/components/layout/footer";
import { ProgressiveBookingFlow } from "@/components/booking/progressive-booking-flow";
import { AnimatedPage } from "@/components/ui/animated-page";

export default function BookPage() {
  return (
  <AnimatedPage>
    <div className="min-h-screen bg-bone dark:bg-gray-950 flex flex-col justify-between">
      <SiteHeader />

      <main className="flex-1 container-x py-10 md:py-14">
        <ProgressiveBookingFlow />
      </main>

      <Footer />
    </div>
  </AnimatedPage>
  );
}