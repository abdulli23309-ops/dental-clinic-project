/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion, type Transition } from "motion/react";
import { fadeUp, staggerContainer } from "@/animations/variants";
import {
  AlertCircle,
  ArrowLeft,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  Lock,
  MapPin,
  Phone,
  ShieldCheck,
  Star,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { Card } from "@/components/ui/card";
import { BookingPausedBanner } from "@/components/booking/booking-paused-banner";
import { usePublicContent } from "@/components/providers/public-content-provider";
import { progressiveBookingCopy } from "@/content/progressive-booking-copy";
import { validateContactDetails } from "@/lib/booking-flow-logic";
import { formatPrice } from "@/lib/currency";
import { getStoredUtmParams } from "@/lib/utm";
import {
  BookingPayload,
  PublicBookingClinicItem,
  PublicBookingDoctorItem,
  PublicBookingServiceItem,
  PublicBookingStatus,
  fetchPublicBookingSettings,
  fetchPublicBookingStatus,
  getPublicBookingClinics,
  getPublicBookingDoctors,
  getPublicBookingServices,
  publicLeadCapture,
  publicLeadUpdate,
  submitBookingRequest,
} from "@/lib/api";

const LEAD_TOKEN_STORAGE_KEY = "mb_booking_lead_token";

function getDoctorInitials(displayName: string): string {
  const clean = displayName.replace(/^(Dr\.|Doctor)\s+/i, "").trim();
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "MD";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export interface BookingPatientContact {
  fullName: string;
  phone: string;
  email: string;
  isForSomeoneElse: boolean;
  dependentName: string;
  visitReason: string;
}

function sanitizeTestId(value: string): string {
  return value.replace(/\s+/g, "-");
}

/** Parses an ISO "YYYY-MM-DD" date key as a local date to avoid timezone drift. */
function parseLocalDate(isoDate: string): Date | null {
  const parts = isoDate.split("-").map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return null;
  return new Date(parts[0], parts[1] - 1, parts[2]);
}

function formatDayLabel(isoDate: string): string {
  const date = parseLocalDate(isoDate);
  if (!date) return isoDate;
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

/**
 * Public 3-page progressive disclosure booking flow for the /book route.
 * Page 1 captures contact details and creates a lead via POST /api/v1/public/leads.
 * Page 2 reveals the service, city, clinic, doctor, and slot waterfall only after
 * each upstream selection, backed entirely by the live booking API.
 * Page 3 reviews the summary and submits a real appointment request.
 */
export function ProgressiveBookingFlow() {
  const { content, currency } = usePublicContent();
  const fallbackPhone = content.general?.phone || "";
  const shouldReduceMotion = useReducedMotion();
  const transitionSettings: Transition = shouldReduceMotion
    ? { duration: 0 }
    : { duration: 0.35, ease: [0.16, 1, 0.3, 1] };

  // Navigation: 1 (Contact) -> 2 (Booking Waterfall) -> 3 (Summary & Confirm)
  const [currentPage, setCurrentPage] = useState<1 | 2 | 3>(1);

  // --- Page 1 State: Contact Details ---
  const [contact, setContact] = useState<BookingPatientContact>({
    fullName: "",
    phone: "",
    email: "",
    isForSomeoneElse: false,
    dependentName: "",
    visitReason: "",
  });
  const [contactErrors, setContactErrors] = useState<Record<string, string>>({});
  const [isLeadCapturing, setIsLeadCapturing] = useState(false);
  const [captureNotice, setCaptureNotice] = useState<string | null>(null);
  const [captureToken, setCaptureToken] = useState<string | null>(() => {
    try {
      return typeof window !== "undefined"
        ? sessionStorage.getItem(LEAD_TOKEN_STORAGE_KEY)
        : null;
    } catch {
      return null;
    }
  });

  // --- Booking Status & Settings ---
  const [bookingStatus, setBookingStatus] = useState<PublicBookingStatus>({ mode: "open" });
  const [daysShownLimit, setDaysShownLimit] = useState<number>(7);

  // --- Page 2 State: Waterfall Data ---
  const [services, setServices] = useState<PublicBookingServiceItem[]>([]);
  const [servicesLoading, setServicesLoading] = useState<boolean>(true);
  const [servicesError, setServicesError] = useState<string | null>(null);

  const [selectedServiceId, setSelectedServiceId] = useState<string>("");
  const [clinics, setClinics] = useState<PublicBookingClinicItem[]>([]);
  const [clinicsLoading, setClinicsLoading] = useState<boolean>(false);
  const [clinicsError, setClinicsError] = useState<string | null>(null);
  const [selectedCity, setSelectedCity] = useState<string>("");
  const [selectedClinicId, setSelectedClinicId] = useState<string>("");

  const [doctors, setDoctors] = useState<PublicBookingDoctorItem[]>([]);
  const [doctorsLoading, setDoctorsLoading] = useState<boolean>(false);
  const [doctorsError, setDoctorsError] = useState<string | null>(null);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>("");

  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [showAllDays, setShowAllDays] = useState<boolean>(false);

  // --- Page 3 State: Submission ---
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [slotConflict, setSlotConflict] = useState<boolean>(false);
  const [submittedData, setSubmittedData] = useState<{
    confirmationId: string;
    callbackWindow?: string;
  } | null>(null);

  // --------------------------------------------------------------------------
  // DATA FETCHING (Live API only; no mock datasets)
  // --------------------------------------------------------------------------

  // 1. Mount: booking pause status, booking settings, and bookable services
  useEffect(() => {
    queueMicrotask(() => {
      fetchPublicBookingStatus()
        .then((status) => setBookingStatus(status))
        .catch(() => setBookingStatus({ mode: "open" }));

      fetchPublicBookingSettings()
        .then((cfg) => {
          if (cfg.leadCaptureNotice) setCaptureNotice(cfg.leadCaptureNotice);
          if (typeof cfg.daysShown === "number" && cfg.daysShown > 0) {
            setDaysShownLimit(cfg.daysShown);
          }
        })
        .catch(() => {});

      setServicesLoading(true);
      getPublicBookingServices()
        .then((items) => {
          setServices(items);
          setServicesError(null);
        })
        .catch(() => {
          setServices([]);
          setServicesError(progressiveBookingCopy.waterfall.errorTreatments);
        })
        .finally(() => setServicesLoading(false));
    });
  }, []);

  // 2. Clinics offering the selected service (each clinic filtered by clinic_services)
  useEffect(() => {
    if (!selectedServiceId) {
      queueMicrotask(() => setClinics([]));
      return;
    }
    let cancelled = false;
    setClinicsLoading(true);
    getPublicBookingClinics(selectedServiceId)
      .then((items) => {
        if (cancelled) return;
        setClinics(items);
        setClinicsError(null);
      })
      .catch(() => {
        if (cancelled) return;
        setClinics([]);
        setClinicsError(progressiveBookingCopy.waterfall.errorClinics);
      })
      .finally(() => {
        if (!cancelled) setClinicsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedServiceId]);

  // 3. Doctors (with real slot calendars) for the selected service + clinic
  useEffect(() => {
    if (!selectedServiceId || !selectedClinicId) {
      queueMicrotask(() => setDoctors([]));
      return;
    }
    let cancelled = false;
    setDoctorsLoading(true);
    getPublicBookingDoctors(selectedServiceId, selectedClinicId)
      .then((items) => {
        if (cancelled) return;
        setDoctors(items);
        setDoctorsError(null);
        if (items.length === 1) {
          // Single clinician at this branch: auto-select and show the intro card
          setSelectedDoctorId(items[0].id);
          const firstOpenDay = Object.entries(items[0].slotsByDate || {})
            .filter(([, slots]) => slots.length > 0)
            .map(([date]) => date)
            .sort()[0];
          if (firstOpenDay) setSelectedDate(firstOpenDay);
        }
      })
      .catch(() => {
        if (cancelled) return;
        setDoctors([]);
        setDoctorsError(progressiveBookingCopy.waterfall.errorClinicians);
      })
      .finally(() => {
        if (!cancelled) setDoctorsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedServiceId, selectedClinicId]);

  // --------------------------------------------------------------------------
  // DERIVED DATA
  // --------------------------------------------------------------------------
  const selectedService = services.find((s) => s.id === selectedServiceId) || null;
  const selectedClinic = clinics.find((c) => c.id === selectedClinicId) || null;
  const selectedDoctor = doctors.find((d) => d.id === selectedDoctorId) || null;

  const availableCities = useMemo(() => {
    const unique = new Set<string>();
    clinics.forEach((c) => {
      if (c.city) unique.add(c.city);
    });
    return Array.from(unique);
  }, [clinics]);

  const clinicsInChosenCity = useMemo(() => {
    if (!selectedCity) return clinics;
    return clinics.filter((c) => c.city === selectedCity);
  }, [clinics, selectedCity]);

  // Days with at least one open slot; fully booked days are hidden entirely
  const openDays = useMemo(() => {
    if (!selectedDoctor || !selectedDoctor.slotsByDate) return [];
    return Object.entries(selectedDoctor.slotsByDate)
      .filter(([, slots]) => Array.isArray(slots) && slots.length > 0)
      .map(([date, slots]) => ({ date, slots }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [selectedDoctor]);

  const visibleDays = showAllDays ? openDays : openDays.slice(0, daysShownLimit);
  const activeDaySlots =
    selectedDate && selectedDoctor?.slotsByDate
      ? selectedDoctor.slotsByDate[selectedDate] || []
      : [];

  const canContinueToSummary = Boolean(
    selectedService && selectedClinic && selectedDoctor && selectedDate && selectedTime
  );

  // --------------------------------------------------------------------------
  // CASCADE RESET HANDLERS (upstream change wipes downstream selections)
  // --------------------------------------------------------------------------
  const handleSelectService = useCallback(
    (serviceId: string) => {
      setSelectedServiceId(serviceId);
      setSelectedCity("");
      setSelectedClinicId("");
      setSelectedDoctorId("");
      setSelectedDate("");
      setSelectedTime("");
      setShowAllDays(false);
      if (captureToken) {
        publicLeadUpdate({ captureToken, serviceId }).catch(() => {});
      }
    },
    [captureToken]
  );

  const handleSelectCity = useCallback((city: string) => {
    setSelectedCity(city);
    setSelectedClinicId("");
    setSelectedDoctorId("");
    setSelectedDate("");
    setSelectedTime("");
  }, []);

  const handleSelectClinic = useCallback(
    (clinicId: string) => {
      setSelectedClinicId(clinicId);
      setSelectedDoctorId("");
      setSelectedDate("");
      setSelectedTime("");
      setShowAllDays(false);
      const clinic = clinics.find((c) => c.id === clinicId);
      if (clinic?.city) setSelectedCity(clinic.city);
      if (captureToken) {
        publicLeadUpdate({ captureToken, clinicId }).catch(() => {});
      }
    },
    [captureToken, clinics]
  );

  const handleSelectDoctor = useCallback(
    (doctorId: string) => {
      setSelectedDoctorId(doctorId);
      setSelectedDate("");
      setSelectedTime("");
      if (captureToken) {
        publicLeadUpdate({ captureToken, teamMemberId: doctorId }).catch(() => {});
      }
    },
    [captureToken]
  );

  const handleSelectDay = useCallback((date: string) => {
    setSelectedDate(date);
    setSelectedTime("");
  }, []);

  const handleSelectSlot = useCallback((slot: string) => {
    setSelectedTime(slot);
    setSlotConflict(false);
    setSubmitError(null);
  }, []);

  // --------------------------------------------------------------------------
  // VALIDATION & SUBMISSION (real backend calls)
  // --------------------------------------------------------------------------
  const validatePage1 = (): boolean => {
    const validation = validateContactDetails(contact.fullName, contact.phone, contact.email);
    const errors: Record<string, string> = {};
    if (validation.nameError) errors.fullName = progressiveBookingCopy.contact.fullNameError;
    if (validation.phoneError) errors.phone = progressiveBookingCopy.contact.phoneError;
    if (validation.emailError) errors.email = progressiveBookingCopy.contact.emailError;
    if (contact.isForSomeoneElse && !contact.dependentName.trim()) {
      errors.dependentName = progressiveBookingCopy.contact.dependentNameError;
    }
    setContactErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Page 1 submit: capture the lead, then reveal the booking waterfall
  const handlePage1Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validatePage1() || isLeadCapturing) return;

    setIsLeadCapturing(true);
    try {
      const res = await publicLeadCapture({
        fullName: contact.fullName.trim(),
        phone: contact.phone.trim(),
        email: contact.email.trim() || undefined,
      });
      if (res.captureToken) {
        setCaptureToken(res.captureToken);
        try {
          sessionStorage.setItem(LEAD_TOKEN_STORAGE_KEY, res.captureToken);
        } catch {
          // Session storage unavailable; the token still lives in component state
        }
        if (res.leadCaptureNotice) setCaptureNotice(res.leadCaptureNotice);
      }
    } catch {
      // Best effort: never block a patient from booking if lead capture fails
    } finally {
      setIsLeadCapturing(false);
      setSubmitError(null);
      setSlotConflict(false);
      setCurrentPage(2);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleProceedToPage3 = () => {
    if (!canContinueToSummary) return;
    setCurrentPage(3);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleChooseDifferentTime = () => {
    setSlotConflict(false);
    setSubmitError(null);
    setSelectedTime("");
    setCurrentPage(2);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Page 3 submit: real appointment request via POST /api/v1/appointments
  const handleFinalConfirm = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setSubmitError(null);

    // Re-verify booking is still open before finalizing
    try {
      const latest = await fetchPublicBookingStatus();
      if (latest.mode !== "open") {
        setBookingStatus(latest);
        setSubmitError(latest.message || progressiveBookingCopy.errors.bookingPaused);
        setIsSubmitting(false);
        return;
      }
    } catch {
      // Continue with submission
    }

    const utms = getStoredUtmParams();
    const finalPatientName =
      contact.isForSomeoneElse && contact.dependentName.trim()
        ? contact.dependentName.trim()
        : contact.fullName.trim();

    const payload: BookingPayload = {
      serviceId: selectedServiceId,
      preferredDate: selectedDate,
      preferredTime: selectedTime,
      fullName: finalPatientName,
      phone: contact.phone.trim(),
      email: contact.email.trim() || undefined,
      notes: contact.visitReason.trim() || undefined,
      clinicId: selectedClinicId,
      teamMemberId: selectedDoctorId,
      utmSource: utms.utm_source,
      utmCampaign: utms.utm_campaign,
    };

    try {
      const response = await submitBookingRequest(payload);
      setSubmittedData({
        confirmationId: response.confirmationId,
        callbackWindow: response.estimatedCallbackWindow,
      });
      try {
        sessionStorage.removeItem(LEAD_TOKEN_STORAGE_KEY);
      } catch {
        // Ignore
      }
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err: unknown) {
      const status = (err as { status?: number }).status;
      const message = err instanceof Error ? err.message : "";
      if (
        status === 409 ||
        message.includes("Double-booking conflict") ||
        message.includes("no longer available")
      ) {
        setSlotConflict(true);
        setSubmitError(progressiveBookingCopy.errors.slotTaken);
        setCurrentPage(2);
      } else {
        setSubmitError(message || progressiveBookingCopy.errors.submitFailed);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // --------------------------------------------------------------------------
  // RENDER
  // --------------------------------------------------------------------------
  const finalPatientName =
    contact.isForSomeoneElse && contact.dependentName.trim()
      ? contact.dependentName.trim()
      : contact.fullName.trim();

  return (
    <div data-testid="progressive-booking-flow" className="w-full max-w-4xl mx-auto">
      <BookingPausedBanner status={bookingStatus} fallbackPhone={fallbackPhone} />

      {/* -------------------------------------------------------------------- */}
      {/* CONFIRMATION (after a successful real appointment request)           */}
      {/* -------------------------------------------------------------------- */}
      {submittedData ? (
        <Card surface="cream" shadow="subtle" className="p-8 sm:p-12 text-center space-y-6">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-emerald-600 text-white">
            <ShieldCheck className="h-7 w-7" />
          </div>

          <div className="space-y-2">
            <span className="text-xs font-mono font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
              {progressiveBookingCopy.confirmation.eyebrow}
            </span>
            <h2 className="font-display text-2xl sm:text-3xl font-semibold text-gray-900 dark:text-white">
              {progressiveBookingCopy.confirmation.heading}
            </h2>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto">
              {progressiveBookingCopy.confirmation.receptionWillCallPrefix}{" "}
              <span className="font-semibold text-gray-900 dark:text-white">{contact.phone}</span>{" "}
              {progressiveBookingCopy.confirmation.receptionWillCallSuffix}
            </p>
          </div>

          <div className="max-w-md mx-auto p-4 rounded-2xl bg-gray-50 dark:bg-gray-950/70 border border-gray-200 dark:border-gray-800 space-y-1">
            <span className="text-[11px] text-gray-400 uppercase tracking-widest font-mono font-medium">
              {progressiveBookingCopy.confirmation.referenceLabel}
            </span>
            <p
              data-testid="booking-confirmation-code"
              className="font-mono text-xl font-bold tracking-wider text-emerald-700 dark:text-emerald-400"
            >
              {submittedData.confirmationId}
            </p>
            {submittedData.callbackWindow && (
              <p className="text-[11px] text-gray-500 dark:text-gray-400 pt-1">
                {progressiveBookingCopy.confirmation.callbackWindowLabel(submittedData.callbackWindow)}
              </p>
            )}
          </div>

          <div className="max-w-md mx-auto text-left text-xs bg-gray-50 dark:bg-gray-950/50 rounded-2xl p-5 border border-gray-100 dark:border-gray-800 space-y-2">
            <div className="flex justify-between py-1 border-b border-gray-200/50 dark:border-gray-800">
              <span className="text-gray-400">{progressiveBookingCopy.confirmation.patientLabel}</span>
              <span className="font-semibold text-gray-900 dark:text-white">
                {finalPatientName}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-gray-200/50 dark:border-gray-800">
              <span className="text-gray-400">{progressiveBookingCopy.confirmation.treatmentLabel}</span>
              <span className="font-semibold text-gray-900 dark:text-white">
                {selectedService?.title || ""}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-gray-200/50 dark:border-gray-800">
              <span className="text-gray-400">{progressiveBookingCopy.confirmation.clinicLabel}</span>
              <span className="font-semibold text-gray-900 dark:text-white">
                {selectedClinic?.name || ""}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-gray-200/50 dark:border-gray-800">
              <span className="text-gray-400">{progressiveBookingCopy.confirmation.clinicianLabel}</span>
              <span className="font-semibold text-gray-900 dark:text-white">
                {selectedDoctor?.displayName || ""}
              </span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-gray-400">{progressiveBookingCopy.confirmation.scheduleLabel}</span>
              <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                {progressiveBookingCopy.scheduleAt(formatDayLabel(selectedDate), selectedTime)}
              </span>
            </div>
          </div>

          <div className="pt-2">
            <Button href="/" variant="secondary">
              {progressiveBookingCopy.confirmation.returnHomeButton}
            </Button>
          </div>
        </Card>
      ) : (
        <>
          {/* Global Header & Step Progress Indicator */}
          <header className="mb-10 text-center space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/80 text-[11px] font-semibold tracking-wider text-emerald-800 dark:text-emerald-300 uppercase">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>{progressiveBookingCopy.header.badge}</span>
            </div>

            <h1 className="font-display text-2xl sm:text-3xl md:text-4xl font-semibold text-gray-900 dark:text-white tracking-tight">
              {progressiveBookingCopy.header.heading}
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 max-w-lg mx-auto leading-relaxed">
              {progressiveBookingCopy.header.subheading}
            </p>

            {/* 3-Step Pill Progress Bar */}
            <nav aria-label={progressiveBookingCopy.header.stepsNavLabel} className="pt-4 max-w-md mx-auto">
              <div className="flex items-center justify-between relative">
                <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-gray-200 dark:bg-gray-800 -translate-y-1/2 z-0" />
                <div
                  className="absolute top-1/2 left-0 h-0.5 bg-emerald-600 transition-all duration-500 -translate-y-1/2 z-0"
                  style={{
                    width: currentPage === 1 ? "0%" : currentPage === 2 ? "50%" : "100%",
                  }}
                />
                {[
                  { step: 1, label: progressiveBookingCopy.header.stepLabels.contact },
                  { step: 2, label: progressiveBookingCopy.header.stepLabels.waterfall },
                  { step: 3, label: progressiveBookingCopy.header.stepLabels.review },
                ].map(({ step, label }) => {
                  const isPast = currentPage > step;
                  const isCurrent = currentPage === step;
                  return (
                    <div key={step} className="relative z-10 flex flex-col items-center">
                      <button
                        type="button"
                        disabled={step > currentPage}
                        onClick={() => {
                          if (step < currentPage) setCurrentPage(step as 1 | 2 | 3);
                        }}
                        aria-label={progressiveBookingCopy.header.stepAriaLabel(step, label)}
                        className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all duration-300 cursor-pointer ${
                          isPast
                            ? "bg-emerald-600 text-white shadow-sm ring-4 ring-emerald-100 dark:ring-emerald-950/60"
                            : isCurrent
                            ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900 shadow-md ring-4 ring-gray-100 dark:ring-gray-800"
                            : "bg-white dark:bg-gray-900 text-gray-400 border border-gray-300 dark:border-gray-700"
                        }`}
                      >
                        {isPast ? <Check className="h-4 w-4" /> : step}
                      </button>
                      <span
                        className={`mt-1.5 text-[11px] font-medium tracking-tight ${
                          isCurrent
                            ? "text-gray-900 dark:text-white"
                            : "text-gray-600 dark:text-gray-400"
                        }`}
                      >
                        {label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </nav>
          </header>

          {/* -------------------------------------------------------------------- */}
          {/* PAGE 1: CONTACT DETAILS (lead capture)                               */}
          {/* -------------------------------------------------------------------- */}
          <AnimatePresence mode="wait">
            {currentPage === 1 && (
              <motion.div
                key="page-1"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={transitionSettings}
              >
                <Card shadow="card" className="p-6 sm:p-8 md:p-10 space-y-8" animate={false}>
                  <div className="space-y-1 pb-4 border-b border-gray-100 dark:border-gray-800">
                    <span className="text-xs font-mono font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                      {progressiveBookingCopy.contact.pageLabel}
                    </span>
                    <h2 className="font-display text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white">
                      {progressiveBookingCopy.contact.heading}
                    </h2>
                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                      {progressiveBookingCopy.contact.subheading}
                    </p>
                  </div>

                  <form onSubmit={handlePage1Submit} className="space-y-6" noValidate>
                    <TextField
                      id="contact-name"
                      label={progressiveBookingCopy.contact.fullNameLabel}
                      required
                      autoComplete="name"
                      placeholder={progressiveBookingCopy.contact.fullNamePlaceholder}
                      value={contact.fullName}
                      error={contactErrors.fullName}
                      onChange={(e) => {
                        setContact({ ...contact, fullName: e.target.value });
                        if (contactErrors.fullName) {
                          setContactErrors({ ...contactErrors, fullName: "" });
                        }
                      }}
                    />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                      <TextField
                        id="contact-phone"
                        label={progressiveBookingCopy.contact.phoneLabel}
                        type="tel"
                        required
                        autoComplete="tel"
                        placeholder={progressiveBookingCopy.contact.phonePlaceholder}
                        value={contact.phone}
                        error={contactErrors.phone}
                        onChange={(e) => {
                          setContact({ ...contact, phone: e.target.value });
                          if (contactErrors.phone) {
                            setContactErrors({ ...contactErrors, phone: "" });
                          }
                        }}
                      />
                      <TextField
                        id="contact-email"
                        label={progressiveBookingCopy.contact.emailLabel}
                        type="email"
                        autoComplete="email"
                        helpText={progressiveBookingCopy.contact.emailHelpText}
                        placeholder={progressiveBookingCopy.contact.emailPlaceholder}
                        value={contact.email}
                        error={contactErrors.email}
                        onChange={(e) => {
                          setContact({ ...contact, email: e.target.value });
                          if (contactErrors.email) {
                            setContactErrors({ ...contactErrors, email: "" });
                          }
                        }}
                      />
                    </div>

                    {/* Booking for someone else toggle */}
                    <div className="pt-1">
                      <label className="flex items-center gap-3 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          data-testid="booking-for-other"
                          checked={contact.isForSomeoneElse}
                          onChange={(e) =>
                            setContact({ ...contact, isForSomeoneElse: e.target.checked })
                          }
                          className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                        />
                        <span className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 font-medium">
                          {progressiveBookingCopy.contact.forSomeoneElseLabel}
                        </span>
                      </label>

                      {contact.isForSomeoneElse && (
                        <div className="mt-3 pl-7">
                          <TextField
                            id="patient-other-name"
                            label={progressiveBookingCopy.contact.dependentNameLabel}
                            required
                            placeholder={progressiveBookingCopy.contact.dependentNamePlaceholder}
                            value={contact.dependentName}
                            error={contactErrors.dependentName}
                            onChange={(e) => {
                              setContact({ ...contact, dependentName: e.target.value });
                              if (contactErrors.dependentName) {
                                setContactErrors({ ...contactErrors, dependentName: "" });
                              }
                            }}
                          />
                        </div>
                      )}
                    </div>

                    <TextField
                      id="visit-notes"
                      label={progressiveBookingCopy.contact.notesLabel}
                      multiline
                      rows={2}
                      placeholder={progressiveBookingCopy.contact.notesPlaceholder}
                      value={contact.visitReason}
                      onChange={(e) => setContact({ ...contact, visitReason: e.target.value })}
                    />

                    <div className="pt-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      {captureNotice && (
                        <p className="text-[11px] text-gray-500 dark:text-gray-400 max-w-xs leading-relaxed">
                          {captureNotice}
                        </p>
                      )}
                      <div className="sm:ml-auto flex justify-end">
                        <Button
                          type="submit"
                          size="lg"
                          isLoading={isLeadCapturing}
                          data-testid="contact-continue-btn"
                        >
                          <span>{progressiveBookingCopy.contact.continueButton}</span>
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </form>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          {/* -------------------------------------------------------------------- */}
          {/* PAGE 2: BOOKING WATERFALL (Service > City > Clinic > Doctor > Slot)  */}
          {/* -------------------------------------------------------------------- */}
          <AnimatePresence mode="wait">
            {currentPage === 2 && (
              <motion.div
                key="page-2"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={transitionSettings}
                className="space-y-6"
              >
                <Card shadow="card" className="p-6 sm:p-8 space-y-6" animate={false}>
                  <div className="space-y-1">
                    <span className="text-xs font-mono font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                      {progressiveBookingCopy.waterfall.pageLabel}
                    </span>
                    <h2
                      data-testid="waterfall-heading"
                      className="font-display text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white"
                    >
                      {progressiveBookingCopy.waterfall.heading}
                    </h2>
                    <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                      {progressiveBookingCopy.waterfall.subheading}
                    </p>
                  </div>

                  {/* Step 2A: Treatment Selection */}
                  <section aria-labelledby="step-2a-heading" className="space-y-4">
                    <h3
                      id="step-2a-heading"
                      className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400"
                    >
                      {progressiveBookingCopy.waterfall.treatmentHeading}
                    </h3>

                    {servicesLoading && (
                      <div
                        data-testid="services-loading"
                        className="flex items-center justify-center gap-2 p-8 rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-950/40"
                      >
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {progressiveBookingCopy.waterfall.loadingTreatments}
                        </span>
                      </div>
                    )}

                    {servicesError && (
                      <div
                        data-testid="services-error"
                        role="alert"
                        className="rounded-2xl border border-rose-200 bg-rose-50 dark:bg-rose-950/30 p-4 text-xs text-rose-700 dark:text-rose-300 flex items-center justify-between gap-3"
                      >
                        <span className="flex items-center gap-2">
                          <AlertCircle className="h-4 w-4 shrink-0" />
                          {servicesError}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setServicesLoading(true);
                            getPublicBookingServices()
                              .then((items) => {
                                setServices(items);
                                setServicesError(null);
                              })
                              .catch(() => setServicesError(progressiveBookingCopy.waterfall.errorTreatments))
                              .finally(() => setServicesLoading(false));
                          }}
                        >
                          {progressiveBookingCopy.waterfall.retryButton}
                        </Button>
                      </div>
                    )}

                    {!servicesLoading && !servicesError && (
                      <div
                        role="radiogroup"
                        aria-label={progressiveBookingCopy.waterfall.groupLabels.treatments}
                        className="grid grid-cols-1 sm:grid-cols-2 gap-3"
                      >
                        {services.map((svc) => {
                          const isSelected = selectedServiceId === svc.id;
                          return (
                            <button
                              key={svc.id}
                              type="button"
                              role="radio"
                              aria-checked={isSelected}
                              data-testid={`service-option-${svc.id}`}
                              onClick={() => handleSelectService(svc.id)}
                              className={`p-4 rounded-2xl border text-left transition-all duration-200 cursor-pointer ${
                                isSelected
                                  ? "border-emerald-600 dark:border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 shadow-md ring-2 ring-emerald-600/30"
                                  : "border-gray-200 dark:border-gray-800 hover:border-emerald-300 dark:hover:border-emerald-800 bg-gray-50/40 dark:bg-gray-950/40 hover:bg-white dark:hover:bg-gray-900"
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <h4 className="font-display text-sm font-semibold text-gray-900 dark:text-white">
                                    {svc.title}
                                  </h4>
                                  <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium mt-0.5">
                                    {svc.category}
                                  </p>
                                </div>
                                {isSelected && (
                                  <span className="h-5 w-5 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                                    <Check className="h-3 w-3" />
                                  </span>
                                )}
                              </div>
                              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                                {svc.shortDesc}
                              </p>
                              <div className="mt-3 flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400 pt-2 border-t border-gray-100 dark:border-gray-800">
                                <span className="inline-flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {svc.duration}
                                </span>
                                <span className="font-semibold text-gray-900 dark:text-white">
                                  {formatPrice(svc.cashPrice, currency.symbol)}
                                </span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </section>

                  {/* Step 2B: City Selection (only when the service spans multiple cities) */}
                  {selectedServiceId && availableCities.length > 1 && (
                    <section aria-labelledby="step-2b-heading" className="space-y-4 pt-2">
                      <h3
                        id="step-2b-heading"
                        className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400"
                      >
                        {progressiveBookingCopy.waterfall.cityHeading}
                      </h3>
                      <div
                        role="radiogroup"
                        aria-label={progressiveBookingCopy.waterfall.groupLabels.cities}
                        className="flex flex-wrap gap-2"
                      >
                        {availableCities.map((city) => {
                          const isSelected = selectedCity === city;
                          return (
                            <button
                              key={city}
                              type="button"
                              role="radio"
                              aria-checked={isSelected}
                              data-testid={`city-option-${city}`}
                              onClick={() => handleSelectCity(city)}
                              className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-xs font-semibold transition-all cursor-pointer ${
                                isSelected
                                  ? "border-emerald-600 bg-emerald-600 text-white"
                                  : "border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:border-emerald-400"
                              }`}
                            >
                              <MapPin className="h-3 w-3" />
                              <span>{city}</span>
                            </button>
                          );
                        })}
                      </div>
                    </section>
                  )}

                  {/* Step 2C: Clinic Selection (only clinics offering the chosen treatment) */}
                  {selectedServiceId && (availableCities.length <= 1 || selectedCity) && (
                    <section aria-labelledby="step-2c-heading" className="space-y-4 pt-2">
                      <h3
                        id="step-2c-heading"
                        className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400"
                      >
                        {progressiveBookingCopy.waterfall.clinicHeading(availableCities.length > 1)}
                      </h3>

                      {clinicsLoading && (
                        <div
                          data-testid="clinics-loading"
                          className="flex items-center justify-center gap-2 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-950/40"
                        >
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {progressiveBookingCopy.waterfall.loadingClinics}
                          </span>
                        </div>
                      )}

                      {clinicsError && (
                        <div
                          data-testid="clinics-error"
                          role="alert"
                          className="rounded-2xl border border-rose-200 bg-rose-50 dark:bg-rose-950/30 p-4 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2"
                        >
                          <AlertCircle className="h-4 w-4 shrink-0" />
                          {clinicsError}
                        </div>
                      )}

                      {!clinicsLoading && !clinicsError && (
                        <div
                          role="radiogroup"
                          aria-label={progressiveBookingCopy.waterfall.groupLabels.clinics}
                          className="grid grid-cols-1 sm:grid-cols-2 gap-3"
                        >
                          {clinicsInChosenCity.map((clinic) => {
                            const isSelected = selectedClinicId === clinic.id;
                            return (
                              <button
                                key={clinic.id}
                                type="button"
                                role="radio"
                                aria-checked={isSelected}
                                data-testid={`clinic-option-${clinic.id}`}
                                onClick={() => handleSelectClinic(clinic.id)}
                                className={`p-4 rounded-2xl border text-left transition-all duration-200 cursor-pointer ${
                                  isSelected
                                    ? "border-emerald-600 dark:border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 shadow-md ring-2 ring-emerald-600/30"
                                    : "border-gray-200 dark:border-gray-800 hover:border-emerald-300 dark:hover:border-emerald-800 bg-gray-50/40 dark:bg-gray-950/40 hover:bg-white dark:hover:bg-gray-900"
                                }`}
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div>
                                    <h4 className="font-display text-sm font-semibold text-gray-900 dark:text-white inline-flex items-center gap-2">
                                      <Building2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                      <span>{clinic.name}</span>
                                    </h4>
                                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                      {clinic.addressLine1}, {clinic.city}
                                      {clinic.phone
                                        ? `${progressiveBookingCopy.waterfall.clinicTelPrefix}${clinic.phone}`
                                        : ""}
                                    </p>
                                  </div>
                                  <span
                                    className={`h-5 w-5 rounded-full border flex items-center justify-center shrink-0 ${
                                      isSelected
                                        ? "border-emerald-600 bg-emerald-600 text-white"
                                        : "border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800"
                                    }`}
                                  >
                                    {isSelected && <Check className="h-3 w-3" />}
                                  </span>
                                </div>
                                {clinic.isPrimary && (
                                  <span className="mt-2 inline-block rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/80 px-2 py-0.5 text-[10px] uppercase font-semibold text-emerald-800 dark:text-emerald-300">
                                    {progressiveBookingCopy.waterfall.mainBranchBadge}
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </section>
                  )}

                  {/* Step 2D: Doctor Selection (single doctor auto-selects with intro card) */}
                  {selectedClinicId && (
                    <section aria-labelledby="step-2d-heading" className="space-y-4 pt-2">
                      <h3
                        id="step-2d-heading"
                        className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400"
                      >
                        {progressiveBookingCopy.waterfall.doctorHeading}
                      </h3>

                      {doctorsLoading && (
                        <div
                          data-testid="doctors-loading"
                          className="flex items-center justify-center gap-2 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-950/40"
                        >
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {progressiveBookingCopy.waterfall.loadingClinicians}
                          </span>
                        </div>
                      )}

                      {doctorsError && (
                        <div
                          data-testid="doctors-error"
                          role="alert"
                          className="rounded-2xl border border-rose-200 bg-rose-50 dark:bg-rose-950/30 p-4 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2"
                        >
                          <AlertCircle className="h-4 w-4 shrink-0" />
                          {doctorsError}
                        </div>
                      )}

                      {!doctorsLoading && !doctorsError && doctors.length === 0 && (
                        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-950/40 p-5 text-center text-xs text-gray-500 dark:text-gray-400">
                          {progressiveBookingCopy.waterfall.noCliniciansAtClinic}
                        </div>
                      )}

                      {!doctorsLoading && !doctorsError && doctors.length === 1 && (
                        <div
                          data-testid="single-doctor-intro"
                          className="rounded-2xl border border-emerald-200 dark:border-emerald-800/80 bg-emerald-50/50 dark:bg-emerald-950/20 p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4"
                        >
                          <div className="relative w-20 sm:w-24 aspect-4/5 rounded-xl overflow-hidden bg-stone-100 dark:bg-gray-800 shrink-0 shadow-xs">
                            {doctors[0].photoUrl ? (
                              <img
                                src={doctors[0].photoUrl}
                                alt={doctors[0].displayName}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-stone-100 to-stone-200 dark:from-gray-850 dark:to-gray-800 text-emerald-800 dark:text-emerald-300">
                                <span className="font-display text-lg font-bold">
                                  {getDoctorInitials(doctors[0].displayName)}
                                </span>
                              </div>
                            )}
                          </div>
                          <div className="space-y-1.5 flex-1 min-w-0">
                            <h4 className="font-display text-base font-bold text-gray-900 dark:text-white">
                              {doctors[0].displayName}
                            </h4>
                            <div className="flex flex-wrap items-center gap-1.5 text-xs">
                              {doctors[0].professionalTitle && (
                                <span className="font-semibold text-blue-600 dark:text-blue-400">
                                  {doctors[0].professionalTitle}
                                </span>
                              )}
                              {doctors[0].professionalTitle && (doctors[0].role || (Array.isArray(doctors[0].specialties) && doctors[0].specialties.length > 0)) && (
                                <span className="text-gray-300 dark:text-gray-600" aria-hidden="true">•</span>
                              )}
                              <span className="text-emerald-700 dark:text-emerald-400 font-medium">
                                {(Array.isArray(doctors[0].specialties) && doctors[0].specialties.length > 0
                                  ? doctors[0].specialties.join(", ")
                                  : doctors[0].role) || "Dentist"}
                              </span>
                            </div>
                            {(doctors[0].biography || doctors[0].bio) && (
                              <p className="text-xs text-gray-600 dark:text-gray-300 line-clamp-2">
                                {doctors[0].biography || doctors[0].bio}
                              </p>
                            )}
                            <div className="flex flex-wrap items-center gap-3 text-[11px] text-gray-500 dark:text-gray-400 pt-1">
                              {typeof doctors[0].patientsTreated === "number" && doctors[0].patientsTreated > 0 && (
                                <span
                                  data-testid="patients-treated-badge"
                                  className="inline-flex items-center gap-1 rounded-full bg-white dark:bg-gray-900 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 font-semibold text-emerald-700 dark:text-emerald-400"
                                >
                                  <Star className="h-3 w-3 fill-emerald-600 text-emerald-600" />
                                  {progressiveBookingCopy.waterfall.patientsTreatedBadge(doctors[0].patientsTreated)}
                                </span>
                              )}
                              <span className="inline-flex items-center gap-1 font-medium">
                                <Calendar className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                                {doctors[0].weeklyScheduleSummary || doctors[0].workingDaysHours}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}

                      {!doctorsLoading && !doctorsError && doctors.length > 1 && (
                        <div className="space-y-3">
                          <motion.div
                            role="radiogroup"
                            aria-label={progressiveBookingCopy.waterfall.groupLabels.clinicians}
                            variants={shouldReduceMotion ? undefined : staggerContainer}
                            initial={shouldReduceMotion ? undefined : "hidden"}
                            animate={shouldReduceMotion ? undefined : "visible"}
                            className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 max-w-3xl"
                          >
                            {doctors.map((doc) => {
                              const isSelected = selectedDoctorId === doc.id;
                              const initials = getDoctorInitials(doc.displayName);
                              const credentials = doc.professionalTitle || "DMD";
                              const specialty =
                                (Array.isArray(doc.specialties) && doc.specialties.length > 0
                                  ? doc.specialties.join(", ")
                                  : doc.role) || "General Dentistry";

                              return (
                                <motion.button
                                  key={doc.id}
                                  type="button"
                                  role="radio"
                                  aria-checked={isSelected}
                                  aria-pressed={isSelected}
                                  data-testid={`doctor-card-${doc.id}`}
                                  onClick={() => handleSelectDoctor(doc.id)}
                                  variants={shouldReduceMotion ? undefined : fadeUp}
                                  whileHover={shouldReduceMotion ? undefined : { y: -4, transition: { duration: 0.2 } }}
                                  className={`group relative rounded-2xl border p-2.5 sm:p-3 flex flex-col text-left transition-all duration-200 cursor-pointer focus:outline-hidden focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 ${
                                    isSelected
                                      ? "border-emerald-600 dark:border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 shadow-md ring-2 ring-emerald-600/30"
                                      : "border-stone-200/80 dark:border-gray-800 bg-[#FAF9F6] dark:bg-gray-900/90 hover:bg-white dark:hover:bg-gray-850 hover:shadow-lg hover:border-emerald-300 dark:hover:border-emerald-800"
                                  }`}
                                >
                                  {/* Top Right Selected Check Badge */}
                                  <span
                                    className={`absolute top-2.5 right-2.5 sm:top-3 sm:right-3 h-5 w-5 rounded-full border flex items-center justify-center transition-all duration-200 z-10 ${
                                      isSelected
                                        ? "border-emerald-600 bg-emerald-600 text-white scale-100 shadow-xs"
                                        : "border-gray-300 dark:border-gray-600 bg-white/90 dark:bg-gray-850/90 text-transparent opacity-0 group-hover:opacity-100"
                                    }`}
                                  >
                                    <Check className="h-3 w-3 stroke-[2.5]" />
                                  </span>

                                  {/* Photo with 4:5 aspect ratio & fallback avatar */}
                                  <div className="relative w-full aspect-4/5 rounded-xl overflow-hidden bg-stone-100 dark:bg-gray-800 mb-2 sm:mb-2.5 shrink-0 shadow-xs">
                                    {doc.photoUrl ? (
                                      <img
                                        src={doc.photoUrl}
                                        alt={doc.displayName}
                                        loading="lazy"
                                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                      />
                                    ) : (
                                      <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-stone-100 via-stone-200/60 to-stone-100 dark:from-gray-850 dark:via-gray-800 dark:to-gray-850 text-emerald-800 dark:text-emerald-300 select-none p-2 text-center">
                                        <span className="font-display text-2xl font-bold tracking-wider">
                                          {initials}
                                        </span>
                                        <span className="text-[10px] font-mono uppercase tracking-wider text-gray-400 dark:text-gray-500 mt-1 line-clamp-1">
                                          {doc.role || "Clinician"}
                                        </span>
                                      </div>
                                    )}
                                  </div>

                                  {/* Doctor Info Below Photo */}
                                  <div className="flex-1 flex flex-col justify-between">
                                    <div>
                                      <h4 className="font-display font-bold text-xs sm:text-sm text-gray-900 dark:text-white line-clamp-1 leading-snug">
                                        {doc.displayName}
                                      </h4>
                                      <div className="mt-1 flex flex-wrap items-center gap-1 text-[11px] leading-tight">
                                        {credentials && (
                                          <span className="font-semibold text-blue-600 dark:text-blue-400">
                                            {credentials}
                                          </span>
                                        )}
                                        {credentials && specialty && (
                                          <span className="text-gray-300 dark:text-gray-600" aria-hidden="true">
                                            •
                                          </span>
                                        )}
                                        {specialty && (
                                          <span className="text-emerald-700 dark:text-emerald-400 font-medium line-clamp-1">
                                            {specialty}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </motion.button>
                              );
                            })}
                          </motion.div>

                          {/* Selected Doctor Availability & Treated Count below grid */}
                          {selectedDoctor && (
                            <motion.div
                              initial={shouldReduceMotion ? undefined : { opacity: 0, y: 6 }}
                              animate={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
                              transition={{ duration: 0.25 }}
                              className="max-w-3xl flex flex-wrap items-center justify-between gap-2 text-xs text-gray-600 dark:text-gray-400 pt-2 border-t border-gray-100 dark:border-gray-800/80"
                            >
                              <div className="inline-flex items-center gap-1.5 font-medium">
                                <Calendar className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                <span>
                                  Available {selectedDoctor.weeklyScheduleSummary || selectedDoctor.workingDaysHours || "Mon-Fri"}
                                </span>
                              </div>
                              {typeof selectedDoctor.patientsTreated === "number" && selectedDoctor.patientsTreated > 0 && (
                                <span
                                  data-testid="patients-treated-badge"
                                  className="inline-flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300"
                                >
                                  <Star className="h-3 w-3 fill-emerald-600 text-emerald-600 dark:fill-emerald-400 dark:text-emerald-400" />
                                  {progressiveBookingCopy.waterfall.patientsTreatedShortBadge(selectedDoctor.patientsTreated)}
                                </span>
                              )}
                            </motion.div>
                          )}
                        </div>
                      )}
                    </section>
                  )}

                  {/* Step 2E: Real Appointment Days & Slots (hidden fully booked days) */}
                  {selectedDoctorId && openDays.length === 0 && !doctorsLoading && (
                    <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-950/40 p-5 text-center text-xs text-gray-500 dark:text-gray-400">
                      {progressiveBookingCopy.waterfall.noOpenDays}
                    </div>
                  )}

                  {selectedDoctorId && openDays.length > 0 && (
                    <section aria-labelledby="step-2e-heading" className="space-y-4 pt-2">
                      <h3
                        id="step-2e-heading"
                        className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400"
                      >
                        {progressiveBookingCopy.waterfall.dateTimeHeading}
                      </h3>

                      <div
                        role="radiogroup"
                        aria-label={progressiveBookingCopy.waterfall.groupLabels.appointmentDays}
                        className="space-y-3"
                      >
                        {visibleDays.map((day) => {
                          const isDaySelected = selectedDate === day.date;
                          return (
                            <div key={day.date} data-testid="doctor-slot-date" className="space-y-2">
                              <button
                                type="button"
                                role="radio"
                                aria-checked={isDaySelected}
                                data-testid={`day-chip-${day.date}`}
                                onClick={() => handleSelectDay(day.date)}
                                className={`w-full flex items-center justify-between rounded-xl border px-4 py-2.5 text-xs font-semibold transition-all cursor-pointer ${
                                  isDaySelected
                                    ? "border-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300"
                                    : "border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:border-emerald-400"
                                }`}
                              >
                                <span className="inline-flex items-center gap-2">
                                  <Calendar className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                                  {formatDayLabel(day.date)}
                                </span>
                                <span
                                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                                    isDaySelected
                                      ? "bg-emerald-600 text-white"
                                      : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
                                  }`}
                                >
                                  {progressiveBookingCopy.waterfall.slotsCountLabel(day.slots.length)}
                                </span>
                              </button>

                              <AnimatePresence>
                                {isDaySelected && (
                                  <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: "auto" }}
                                    exit={{ opacity: 0, height: 0 }}
                                    transition={transitionSettings}
                                    className="overflow-hidden"
                                  >
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                                      {day.slots.map((slot) => {
                                        const isSlotSelected = selectedTime === slot;
                                        return (
                                          <button
                                            key={slot}
                                            type="button"
                                            aria-pressed={isSlotSelected}
                                            data-testid={`slot-chip-${sanitizeTestId(slot)}`}
                                            onClick={() => handleSelectSlot(slot)}
                                            className={`py-2.5 px-3 rounded-xl border text-xs font-mono font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                                              isSlotSelected
                                                ? "border-emerald-600 bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-600/30"
                                                : "border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-900 dark:text-white hover:border-emerald-400 hover:bg-emerald-50/30"
                                            }`}
                                          >
                                            <Clock className="h-3.5 w-3.5" />
                                            <span>{slot}</span>
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          );
                        })}
                      </div>

                      {openDays.length > daysShownLimit && !showAllDays && (
                        <Button variant="ghost" size="sm" onClick={() => setShowAllDays(true)}>
                          {progressiveBookingCopy.waterfall.showAllDays(openDays.length)}
                        </Button>
                      )}
                    </section>
                  )}

                  {/* Submission error / slot conflict alert */}
                  {submitError && (
                    <div
                      data-testid="booking-error"
                      role="alert"
                      className="rounded-2xl border border-rose-200 bg-rose-50 dark:bg-rose-950/30 p-4 text-xs text-rose-700 dark:text-rose-300 space-y-3"
                    >
                      <span className="flex items-center gap-2 font-medium">
                        <AlertCircle className="h-4 w-4 shrink-0" />
                        {submitError}
                      </span>
                      {slotConflict && (
                        <Button variant="outline" size="sm" onClick={handleChooseDifferentTime}>
                          {progressiveBookingCopy.waterfall.chooseDifferentTime}
                        </Button>
                      )}
                    </div>
                  )}

                  {/* Waterfall footer: back + continue once a slot is chosen */}
                  <div className="pt-4 flex items-center justify-between border-t border-gray-100 dark:border-gray-800">
                    <Button variant="ghost" onClick={() => setCurrentPage(1)}>
                      <ArrowLeft className="h-4 w-4" />
                      <span>{progressiveBookingCopy.waterfall.backToContact}</span>
                    </Button>

                    <AnimatePresence>
                      {canContinueToSummary && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          transition={transitionSettings}
                        >
                          <Button
                            size="lg"
                            onClick={handleProceedToPage3}
                            data-testid="continue-to-summary-btn"
                          >
                            <span>{progressiveBookingCopy.waterfall.continueToSummary}</span>
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          {/* -------------------------------------------------------------------- */}
          {/* PAGE 3: SUMMARY & REVIEW (real appointment request submission)       */}
          {/* -------------------------------------------------------------------- */}
          <AnimatePresence mode="wait">
            {currentPage === 3 && (
              <motion.div
                key="page-3"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={transitionSettings}
              >
                <Card shadow="card" className="p-6 sm:p-8 md:p-10 space-y-8" animate={false}>
                  <div className="space-y-1 pb-4 border-b border-gray-100 dark:border-gray-800">
                    <span className="text-xs font-mono font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                      {progressiveBookingCopy.review.pageLabel}
                    </span>
                    <h2 className="font-display text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white">
                      {progressiveBookingCopy.review.heading}
                    </h2>
                    <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                      {progressiveBookingCopy.review.subheading}
                    </p>
                  </div>

                  <dl className="text-xs space-y-2">
                    <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                      <dt className="text-gray-400 inline-flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5" />
                        {progressiveBookingCopy.review.patientLabel}
                      </dt>
                      <dd className="font-semibold text-gray-900 dark:text-white">
                        {finalPatientName}
                      </dd>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                      <dt className="text-gray-400 inline-flex items-center gap-1.5">
                        <Phone className="h-3.5 w-3.5" />
                        {progressiveBookingCopy.review.contactLabel}
                      </dt>
                      <dd className="font-semibold text-gray-900 dark:text-white text-right">
                        {contact.isForSomeoneElse && contact.fullName && (
                          <span className="block text-gray-900 dark:text-white">{contact.fullName}</span>
                        )}
                        <span>{contact.phone}</span>
                        {contact.email && (
                          <span className="block text-[11px] font-normal text-gray-500 dark:text-gray-400">
                            {contact.email}
                          </span>
                        )}
                      </dd>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                      <dt className="text-gray-400">{progressiveBookingCopy.review.treatmentLabel}</dt>
                      <dd className="font-semibold text-gray-900 dark:text-white text-right">
                        {selectedService?.title}
                        <span className="block text-[11px] font-normal text-gray-500 dark:text-gray-400">
                          {formatPrice(selectedService?.cashPrice, currency.symbol)} ·{" "}
                          {selectedService?.duration}
                        </span>
                      </dd>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                      <dt className="text-gray-400 inline-flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5" />
                        {progressiveBookingCopy.review.clinicLabel}
                      </dt>
                      <dd className="font-semibold text-gray-900 dark:text-white text-right">
                        {selectedClinic?.name}
                        <span className="block text-[11px] font-normal text-gray-500 dark:text-gray-400">
                          {selectedClinic?.addressLine1}, {selectedClinic?.city}
                        </span>
                      </dd>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                      <dt className="text-gray-400">{progressiveBookingCopy.review.clinicianLabel}</dt>
                      <dd className="font-semibold text-gray-900 dark:text-white">
                        {selectedDoctor?.displayName}
                      </dd>
                    </div>
                    <div className="flex justify-between py-2">
                      <dt className="text-gray-400 inline-flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5" />
                        {progressiveBookingCopy.review.scheduleLabel}
                      </dt>
                      <dd className="font-semibold text-emerald-700 dark:text-emerald-400">
                        {progressiveBookingCopy.scheduleAt(formatDayLabel(selectedDate), selectedTime)}
                      </dd>
                    </div>
                  </dl>

                  {contact.visitReason.trim() && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 border-t border-gray-100 dark:border-gray-800 pt-4">
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {progressiveBookingCopy.review.notesLabel}
                      </span>{" "}
                      {contact.visitReason.trim()}
                    </p>
                  )}

                  <p className="inline-flex items-center gap-2 text-[11px] text-gray-500 dark:text-gray-400">
                    <Lock className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                    {progressiveBookingCopy.review.privacyNotice}
                  </p>

                  {submitError && (
                    <div
                      data-testid="booking-error"
                      role="alert"
                      className="rounded-2xl border border-rose-200 bg-rose-50 dark:bg-rose-950/30 p-4 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2 font-medium"
                    >
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      {submitError}
                    </div>
                  )}

                  <div className="pt-2 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-gray-100 dark:border-gray-800 pt-5">
                    <Button variant="ghost" onClick={() => setCurrentPage(2)}>
                      <ArrowLeft className="h-4 w-4" />
                      <span>{progressiveBookingCopy.review.backToEdit}</span>
                    </Button>
                    <Button
                      size="lg"
                      isLoading={isSubmitting}
                      onClick={handleFinalConfirm}
                      data-testid="booking-confirm-btn"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      <span>{progressiveBookingCopy.review.confirmButton}</span>
                    </Button>
                  </div>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </div>
  );
}
