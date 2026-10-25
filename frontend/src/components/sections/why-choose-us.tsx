"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import {
  CheckCircle2,
  Calendar,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { usePublicContent } from "@/components/providers/public-content-provider";
import { getServices, publicLeadCapture, publicLeadUpdate, ServiceItem } from "@/lib/api";

const LEAD_TOKEN_STORAGE_KEY = "mb_booking_lead_token";

export function WhyChooseUs() {
  const router = useRouter();
  const { content, organization, copy } = usePublicContent();
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [selectedService, setSelectedService] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const promises = content.homepage?.promises || [];
  const practiceName =
    content.general?.practiceName || organization?.displayName || "";

  useEffect(() => {
    let mounted = true;
    getServices()
      .then((data) => {
        if (mounted && Array.isArray(data)) {
          setServices(data.filter((s) => s.isActive !== false));
        }
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanPhone = phone.trim();
    const cleanName = fullName.trim();

    if (!cleanName) {
      setErrorMsg(copy.enterFullNameError);
      return;
    }

    const digits = cleanPhone.replace(/[^0-9]/g, "");
    if (digits.length < 10) {
      setErrorMsg(copy.enterValidPhoneError);
      return;
    }

    // Bot honeypot caught
    if (honeypot.trim()) {
      router.push("/book");
      return;
    }

    setLoading(true);

    try {
      // 1. Capture public lead
      const captureRes = await publicLeadCapture({
        fullName: cleanName,
        phone: cleanPhone,
      });

      if (captureRes?.captureToken) {
        // Save token to session storage for progressive booking wizard
        if (typeof window !== "undefined") {
          sessionStorage.setItem(LEAD_TOKEN_STORAGE_KEY, captureRes.captureToken);
        }

        // 2. If service was selected, update lead record
        if (selectedService) {
          await publicLeadUpdate({
            captureToken: captureRes.captureToken,
            serviceId: selectedService,
          }).catch(() => {});
        }

        // 3. Continue to booking flow with preselected service
        const query = selectedService ? `?service=${encodeURIComponent(selectedService)}` : "";
        router.push(`/book${query}`);
      } else {
        router.push("/book");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to record inquiry. Please try again.";
      setErrorMsg(msg);
      setLoading(false);
    }
  };

  return (
    <section
      id="why-us"
      className="border-t border-gray-200 dark:border-gray-800 bg-gray-50/70 dark:bg-gray-900/50 py-20 md:py-28"
    >
      <div className="container-x">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-14 items-start">
          {/* Left Column: Why Choose Us Promises + 3-Step Strip */}
          <div className="lg:col-span-7 space-y-8">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                <Sparkles className="h-3.5 w-3.5" />
                <span>{copy.whyUs || "Why Choose Us"}</span>
              </div>
              <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-gray-950 dark:text-white leading-tight">
                {copy.modernDentalCare}
              </h2>
              {practiceName && (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Experience patient-centered clinical excellence at {practiceName}.
                </p>
              )}
            </div>

            {/* Promises List (from CMS) */}
            <div className="space-y-4">
              {promises.length > 0 ? (
                promises.map((p, idx) => (
                  <motion.div
                    key={p.num || idx}
                    initial={{ opacity: 0, y: 12 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.2 }}
                    transition={{ duration: 0.4, delay: idx * 0.08 }}
                    className="rounded-2xl border border-gray-200/80 dark:border-gray-800/80 bg-white dark:bg-gray-950 p-5 shadow-xs hover:border-primary/40 transition-colors"
                  >
                    <div className="flex items-start gap-4">
                      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary font-mono text-sm font-bold">
                        {p.num || `0${idx + 1}`}
                      </div>
                      <div className="space-y-1">
                        <h3 className="font-display text-base font-semibold text-gray-900 dark:text-white">
                          {p.title}
                        </h3>
                        {p.subtitle && (
                          <p className="text-xs font-medium text-primary">
                            {p.subtitle}
                          </p>
                        )}
                        <p className="text-xs sm:text-[13px] leading-relaxed text-gray-600 dark:text-gray-400">
                          {p.description}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="rounded-2xl border border-gray-200/80 dark:border-gray-800/80 bg-white dark:bg-gray-950 p-5 space-y-3">
                  <div className="flex items-center gap-3 text-sm font-semibold text-gray-900 dark:text-white">
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                    <span>Transparent Pricing & Zero Surprise Fees</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm font-semibold text-gray-900 dark:text-white">
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                    <span>Gentle, Minimally Invasive Treatment Protocols</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm font-semibold text-gray-900 dark:text-white">
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                    <span>Direct Doctor Access & Continuity of Care</span>
                  </div>
                </div>
              )}
            </div>

            {/* Visit in Three Steps Strip */}
            <div className="rounded-2xl border border-primary/20 bg-primary/5 dark:bg-primary/10 p-5">
              <div className="text-xs font-bold uppercase tracking-wider text-primary mb-3">
                Your Visit in 3 Simple Steps
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div className="space-y-1">
                  <div className="font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                    <span className="grid h-5 w-5 place-items-center rounded-full bg-primary text-white text-[10px]">1</span>
                    <span>Choose Treatment</span>
                  </div>
                  <p className="text-gray-600 dark:text-gray-400 text-[11px]">
                    Select routine care or specialized aesthetic dentistry.
                  </p>
                </div>
                <div className="space-y-1">
                  <div className="font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                    <span className="grid h-5 w-5 place-items-center rounded-full bg-primary text-white text-[10px]">2</span>
                    <span>Pick Your Time</span>
                  </div>
                  <p className="text-gray-600 dark:text-gray-400 text-[11px]">
                    Select convenient slots with your chosen clinician.
                  </p>
                </div>
                <div className="space-y-1">
                  <div className="font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                    <span className="grid h-5 w-5 place-items-center rounded-full bg-primary text-white text-[10px]">3</span>
                    <span>Instant Confirmation</span>
                  </div>
                  <p className="text-gray-600 dark:text-gray-400 text-[11px]">
                    Get immediate SMS booking details & calendar invite.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Instant Booking Lead Form */}
          <div className="lg:col-span-5">
            <Card
              surface="bone"
              shadow="card"
              className="p-6 sm:p-8 rounded-3xl border border-gray-200/90 dark:border-gray-800/90 bg-white/95 dark:bg-gray-950/95 shadow-xl backdrop-blur-md sticky top-28"
            >
              <div className="space-y-2 mb-6">
                <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary">
                  <Calendar className="h-4 w-4" />
                  <span>{copy.onlineReservation}</span>
                </div>
                <h3 className="font-display text-2xl font-bold tracking-tight text-gray-950 dark:text-white">
                  {copy.bookAppointment}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {copy.enterBookingDetails}
                </p>
              </div>

              {errorMsg && (
                <div className="mb-4 rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/50 p-3 text-xs text-red-700 dark:text-red-300 flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Honeypot field (hidden from real users) */}
                <div className="hidden" aria-hidden="true">
                  <label htmlFor="hp_check">Leave empty</label>
                  <input
                    id="hp_check"
                    type="text"
                    tabIndex={-1}
                    value={honeypot}
                    onChange={(e) => setHoneypot(e.target.value)}
                    autoComplete="off"
                  />
                </div>

                {/* Full Name */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="lead_name"
                    className="block text-xs font-semibold text-gray-700 dark:text-gray-300"
                  >
                    {copy.fullName} <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="lead_name"
                    type="text"
                    required
                    placeholder="e.g. Sarah Ahmed"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3.5 py-2.5 text-xs sm:text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-all"
                  />
                </div>

                {/* Phone Number */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="lead_phone"
                    className="block text-xs font-semibold text-gray-700 dark:text-gray-300"
                  >
                    {copy.mobilePhone} <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="lead_phone"
                    type="tel"
                    required
                    placeholder="e.g. 0300 1234567"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3.5 py-2.5 text-xs sm:text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-all"
                  />
                </div>

                {/* Service Selection */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="lead_service"
                    className="block text-xs font-semibold text-gray-700 dark:text-gray-300"
                  >
                    Treatment Needed (Optional)
                  </label>
                  <select
                    id="lead_service"
                    value={selectedService}
                    onChange={(e) => setSelectedService(e.target.value)}
                    className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3.5 py-2.5 text-xs sm:text-sm text-gray-900 dark:text-white focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-all"
                  >
                    <option value="">Select a treatment (optional)...</option>
                    {services.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.title} {s.cashPrice ? `(${s.cashPrice})` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Submit CTA */}
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  disabled={loading}
                  className="w-full rounded-xl py-3 text-sm font-semibold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 mt-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Saving your inquiry...</span>
                    </>
                  ) : (
                    <>
                      <span>Continue to Booking</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>

                <div className="flex items-center gap-2 pt-2 text-[11px] text-gray-500 dark:text-gray-400">
                  <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
                  <span>Confidential. Your phone is only used for appointment scheduling.</span>
                </div>
              </form>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
}

export default WhyChooseUs;
