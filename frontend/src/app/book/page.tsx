"use client";

import { Suspense } from "react";
import SiteHeader from "@/components/layout/site-header";
import Footer from "@/components/layout/footer";
import { BookingWizard } from "@/components/booking/booking-wizard";

export default function BookPage() {
  return (
    <div className="min-h-screen bg-bone dark:bg-gray-950 flex flex-col justify-between">
      <SiteHeader />

      <main className="flex-1 container-x py-10 md:py-14">
        <Suspense
          fallback={
            <div className="min-h-[50vh] flex items-center justify-center text-sm text-ink-soft">
              Loading appointment scheduler...
            </div>
          }
        >
          <BookingWizard mode="public" />
        </Suspense>
      </main>

      <Footer />
    </div>
  );
}