"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import {
  ShieldCheck,
  ArrowLeft,
  ArrowRight,
  XCircle,
  Building2,
  Sparkles,
  Lock,
  Calendar,
  Clock,
  User,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { Card } from "@/components/ui/card";
import { BookingPausedBanner } from "@/components/booking/booking-paused-banner";
import { getStoredUtmParams } from "@/lib/utm";
import {
  submitBookingRequest,
  createReceptionBooking,
  BookingPayload,
  fetchPublicBookingStatus,
  fetchPublicBookingSettings,
  PublicBookingStatus,
  getPublicBookingServices,
  getPublicBookingClinics,
  getPublicBookingDoctors,
  publicLeadCapture,
  publicLeadUpdate,
  PublicBookingServiceItem,
  PublicBookingClinicItem,
  PublicBookingDoctorItem,
} from "@/lib/api";
import { formatPrice } from "@/lib/currency";
import { usePublicContent } from "@/components/providers/public-content-provider";
import { bookingCopy } from "@/content/booking-copy";
import {
  FlowStep,
  checkServiceSkip,
  checkClinicSkip,
  checkDoctorAutoSelect,
  getNextStep,
  getPreviousStep,
} from "@/lib/booking-flow-logic";

const LEAD_TOKEN_STORAGE_KEY = "mb_booking_lead_token";

export interface BookingWizardProps {
  mode?: "public" | "call_desk";
  initialPhone?: string;
  initialPatientName?: string;
  initialEmail?: string;
  lockPhone?: boolean;
  preselectedServiceId?: string;
  onBookingComplete?: (confirmation: {
    confirmationId: string;
    callbackWindow?: string;
    patientName: string;
    phone: string;
    clinicName: string;
    doctorName: string;
    dateTime: string;
  }) => void;
}

export function BookingWizard({
  mode = "public",
  initialPhone = "",
  initialPatientName = "",
  initialEmail = "",
  lockPhone = false,
  preselectedServiceId,
  onBookingComplete,
}: BookingWizardProps) {
  const { content, primaryLocation, currency } = usePublicContent();
  const phone = content.general?.phone || primaryLocation?.phone || "";
  const router = useRouter();
  const searchParams = useSearchParams();

  const copy = bookingCopy.en;

  const urlStepParam = searchParams.get("step");
  const initialStep = urlStepParam
    ? (Math.min(5, Math.max(0, parseInt(urlStepParam, 10))) as FlowStep)
    : 0;

  // Step tracker
  const [step, setStep] = useState<FlowStep>(initialStep);

  // Form State
  const [contact, setContact] = useState({
    name: initialPatientName || "",
    phone: initialPhone || "",
    email: initialEmail || "",
  });
  const [isPhoneLocked, setIsPhoneLocked] = useState(lockPhone);
  const [showUnlockConfirm, setShowUnlockConfirm] = useState(false);
  const [captureNotice, setCaptureNotice] = useState<string>(copy.contactStep.defaultNotice);
  const [captureToken, setCaptureToken] = useState<string | null>(() => {
    try {
      return typeof window !== "undefined" ? sessionStorage.getItem(LEAD_TOKEN_STORAGE_KEY) : null;
    } catch {
      return null;
    }
  });

  // Selections
  const [services, setServices] = useState<PublicBookingServiceItem[]>([]);
  const [selectedService, setSelectedService] = useState<string>(preselectedServiceId || "");
  const [clinics, setClinics] = useState<PublicBookingClinicItem[]>([]);
  const [selectedClinic, setSelectedClinic] = useState<string>("");
  const [doctors, setDoctors] = useState<PublicBookingDoctorItem[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedTime, setSelectedTime] = useState<string>("");

  // Doctor Step UI State: expanded dates
  const [showAllDays, setShowAllDays] = useState(false);

  // Notes & Booking For
  const [bookingFor, setBookingFor] = useState<"myself" | "other">("myself");
  const [patientName, setPatientName] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  // UI / Loading states
  const [bookingStatus, setBookingStatus] = useState<PublicBookingStatus>({ mode: "open" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submittedData, setSubmittedData] = useState<{
    confirmationId: string;
    callbackWindow: string;
  } | null>(null);

  // Update URL step state when step changes
  const updateUrlStep = useCallback(
    (targetStep: FlowStep) => {
      setStep(targetStep);
      if (mode === "public") {
        const params = new URLSearchParams(searchParams.toString());
        params.set("step", targetStep.toString());
        router.push(`/book?${params.toString()}`);
      }
    },
    [mode, router, searchParams]
  );

  // 1. Fetch Emergency Pause Status & Bookable Services on Mount
  useEffect(() => {
    queueMicrotask(() => {
      fetchPublicBookingStatus()
        .then((st) => setBookingStatus(st))
        .catch(() => setBookingStatus({ mode: "open" }));

      fetchPublicBookingSettings()
        .then((cfg) => {
          if (cfg.leadCaptureNotice) {
            setCaptureNotice(cfg.leadCaptureNotice);
          }
        })
        .catch(() => {});

      getPublicBookingServices()
        .then((svcs) => {
          setServices(svcs);
          const serviceSkip = checkServiceSkip(svcs);
          if (preselectedServiceId && svcs.some((s) => s.id === preselectedServiceId || s.slug === preselectedServiceId)) {
            const match = svcs.find((s) => s.id === preselectedServiceId || s.slug === preselectedServiceId);
            if (match) setSelectedService(match.id);
          } else if (serviceSkip.shouldSkip && serviceSkip.autoSelectedId) {
            setSelectedService(serviceSkip.autoSelectedId);
          }
        })
        .catch(() => setServices([]));
    });
  }, [preselectedServiceId]);

  // 2. Fetch Clinics when selectedService changes
  useEffect(() => {
    queueMicrotask(() => {
      if (!selectedService) {
        setClinics([]);
        setSelectedClinic("");
        return;
      }
      getPublicBookingClinics(selectedService)
        .then((cls) => {
          setClinics(cls);
          const clinicSkip = checkClinicSkip(cls);
          if (clinicSkip.shouldSkip && clinicSkip.autoSelectedId) {
            setSelectedClinic(clinicSkip.autoSelectedId);
          } else if (!cls.some((c) => c.id === selectedClinic)) {
            setSelectedClinic("");
          }
        })
        .catch(() => setClinics([]));
    });
  }, [selectedService, selectedClinic]);

  // 3. Fetch Doctors when selectedService and selectedClinic are set
  useEffect(() => {
    queueMicrotask(() => {
      if (!selectedService || !selectedClinic) {
        setDoctors([]);
        setSelectedDoctor("");
        return;
      }
      getPublicBookingDoctors(selectedService, selectedClinic)
        .then((docs) => {
          setDoctors(docs);
          const docAuto = checkDoctorAutoSelect(docs);
          if (docAuto.isSingleDoctor && docAuto.autoSelectedDoctor) {
            setSelectedDoctor(docAuto.autoSelectedDoctor.id);
          } else if (!docs.some((d) => d.id === selectedDoctor)) {
            setSelectedDoctor("");
          }
        })
        .catch(() => setDoctors([]));
    });
  }, [selectedService, selectedClinic, selectedDoctor]);

  // Validation
  const validateContact = () => {
    const errs: Record<string, string> = {};
    if (!contact.name.trim()) {
      errs.name = copy.contactStep.nameError;
    }
    const cleanPh = contact.phone.replace(/\D/g, "");
    if (cleanPh.length < 10) {
      errs.phone = copy.contactStep.phoneError;
    }
    if (contact.email && (!contact.email.includes("@") || !contact.email.includes("."))) {
      errs.email = copy.contactStep.emailError;
    }
    setErrors(errs);
    setTouched({ name: true, phone: true, email: true });
    return Object.keys(errs).length === 0;
  };

  // Step 0 Continue: Save Lead
  const handleContactContinue = async () => {
    if (!validateContact()) return;
    if (mode === "call_desk") {
      const next = getNextStep(0, {
        servicesCount: services.length,
        clinicsCount: clinics.length,
      });
      updateUrlStep(next);
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await publicLeadCapture({
        fullName: contact.name,
        phone: contact.phone,
        email: contact.email || undefined,
      });
      if (res.captureToken) {
        setCaptureToken(res.captureToken);
        try {
          sessionStorage.setItem(LEAD_TOKEN_STORAGE_KEY, res.captureToken);
        } catch {
          // Ignore
        }
        if (res.leadCaptureNotice) {
          setCaptureNotice(res.leadCaptureNotice);
        }
      }
      const next = getNextStep(0, {
        servicesCount: services.length,
        clinicsCount: clinics.length,
      });
      updateUrlStep(next);
    } catch {
      // Proceed even if offline / mock
      const next = getNextStep(0, {
        servicesCount: services.length,
        clinicsCount: clinics.length,
      });
      updateUrlStep(next);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step 1 Continue: Service Selected
  const handleServiceContinue = async () => {
    if (!selectedService) return;
    if (captureToken && mode !== "call_desk") {
      publicLeadUpdate({ captureToken, serviceId: selectedService }).catch(() => {});
    }
    const next = getNextStep(1, {
      servicesCount: services.length,
      clinicsCount: clinics.length,
    });
    updateUrlStep(next);
  };

  // Step 2 Continue: Clinic Selected
  const handleClinicContinue = async () => {
    if (!selectedClinic) return;
    if (captureToken && mode !== "call_desk") {
      publicLeadUpdate({ captureToken, clinicId: selectedClinic }).catch(() => {});
    }
    const next = getNextStep(2, {
      servicesCount: services.length,
      clinicsCount: clinics.length,
    });
    updateUrlStep(next);
  };

  // Step 3 Continue: Doctor & Time Selected
  const handleDoctorTimeContinue = async () => {
    if (!selectedDoctor || !selectedDate || !selectedTime) return;
    if (captureToken && mode !== "call_desk") {
      publicLeadUpdate({
        captureToken,
        teamMemberId: selectedDoctor,
      }).catch(() => {});
    }
    const next = getNextStep(3, {
      servicesCount: services.length,
      clinicsCount: clinics.length,
    });
    updateUrlStep(next);
  };

  // Step 4 Continue: Notes & Booking For
  const handleNotesContinue = () => {
    if (bookingFor === "other" && !patientName.trim()) {
      setErrors({ patientName: copy.notesStep.patientNameError });
      return;
    }
    if (captureToken && notes && mode !== "call_desk") {
      publicLeadUpdate({ captureToken, notes }).catch(() => {});
    }
    const next = getNextStep(4, {
      servicesCount: services.length,
      clinicsCount: clinics.length,
    });
    updateUrlStep(next);
  };

  // Back navigation
  const handleBack = () => {
    const prev = getPreviousStep(step, {
      servicesCount: services.length,
      clinicsCount: clinics.length,
    });
    updateUrlStep(prev);
  };

  // Final Submit on Review Step
  const handleFinalSubmit = async () => {
    setIsSubmitting(true);
    setSubmitError(null);

    // Re-verify status before finalizing
    try {
      const latest = await fetchPublicBookingStatus();
      if (latest.mode !== "open") {
        setBookingStatus(latest);
        setSubmitError(latest.message || copy.errors.bookingPausedSubmit);
        setIsSubmitting(false);
        return;
      }
    } catch {
      // Continue
    }

    const utms = getStoredUtmParams();
    const finalPatientName =
      bookingFor === "other" && patientName.trim() ? patientName.trim() : contact.name;
    const payload: BookingPayload = {
      serviceId: selectedService,
      preferredDate: selectedDate,
      preferredTime: selectedTime,
      fullName: finalPatientName,
      phone: contact.phone,
      email: contact.email || undefined,
      notes: notes,
      clinicId: selectedClinic,
      teamMemberId: selectedDoctor,
      utmSource: utms.utm_source,
      utmCampaign: utms.utm_campaign,
    };

    try {
      let confirmationId = "";
      let callbackWindow = "";

      if (mode === "call_desk") {
        const response = await createReceptionBooking({
          patientFullName: finalPatientName,
          patientPhone: contact.phone,
          patientEmail: contact.email || undefined,
          bookingDate: selectedDate,
          bookingTime: selectedTime,
          clinicId: selectedClinic || undefined,
          serviceId: selectedService || undefined,
          teamMemberId: selectedDoctor || undefined,
          source: "call_desk",
          notes: notes,
        });
        confirmationId = response.id;
      } else {
        const response = await submitBookingRequest(payload);
        confirmationId = response.confirmationId;
        callbackWindow = response.estimatedCallbackWindow;
      }

      setSubmittedData({
        confirmationId,
        callbackWindow,
      });

      if (onBookingComplete) {
        onBookingComplete({
          confirmationId,
          callbackWindow,
          patientName: finalPatientName,
          phone: contact.phone,
          clinicName: selectedClinicObj?.name || "",
          doctorName: selectedDoctorObj?.displayName || "",
          dateTime: `${selectedDate} at ${selectedTime}`,
        });
      }

      // Clear lead token from storage upon successful booking
      try {
        sessionStorage.removeItem(LEAD_TOKEN_STORAGE_KEY);
      } catch {
        // Ignore
      }
    } catch (err: unknown) {
      const status = (err as { status?: number }).status;
      const message = err instanceof Error ? err.message : "";
      if (
        status === 409 ||
        message.includes("Double-booking conflict") ||
        message.includes("no longer available")
      ) {
        setSubmitError(copy.errors.slotTaken);
      } else {
        setSubmitError(message || copy.errors.generalSubmit);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedServiceObj = services.find((s) => s.id === selectedService);
  const selectedClinicObj = clinics.find((c) => c.id === selectedClinic);
  const selectedDoctorObj = doctors.find((d) => d.id === selectedDoctor);
  const isBookingPaused = bookingStatus.mode !== "open";
  const doctorAutoState = checkDoctorAutoSelect(doctors);

  return (
    <div className="w-full">
      <BookingPausedBanner status={bookingStatus} fallbackPhone={phone} />

      {submittedData ? (
        /* Confirmation Screen */
        <div className="mx-auto max-w-xl text-center">
          <Card surface="cream" shadow="subtle" className="p-8 sm:p-12">
            <div className="mx-auto mb-6 grid h-14 w-14 place-items-center rounded-full bg-forest text-[#FAF7F2]">
              <ShieldCheck className="h-7 w-7" />
            </div>

            <p className="eyebrow mb-2">{copy.confirmationStep.eyebrow}</p>
            <h1 className="text-[30px] sm:text-[38px] leading-tight text-ink font-normal">
              {copy.confirmationStep.title}
            </h1>
            <p className="mt-4 text-sm text-ink-soft max-w-md mx-auto">
              {copy.confirmationStep.subtitle}
            </p>

            <div className="my-8 rounded-[var(--radius-card)] border border-line bg-bone p-4 text-left font-mono text-xs space-y-2">
              <p>
                <span className="text-ink-soft">{copy.confirmationStep.referenceLabel}</span>{" "}
                <strong className="text-ink font-bold">{submittedData.confirmationId}</strong>
              </p>
              <p>
                <span className="text-ink-soft">{copy.confirmationStep.branchLabel}</span>{" "}
                <strong className="text-ink">{selectedClinicObj?.name || "Marlow Dental Practice"}</strong>
              </p>
              <p>
                <span className="text-ink-soft">{copy.confirmationStep.clinicianLabel}</span>{" "}
                <strong className="text-ink">{selectedDoctorObj?.displayName || "Lead Clinician"}</strong>
              </p>
              <p>
                <span className="text-ink-soft">{copy.confirmationStep.timeLabel}</span>{" "}
                <strong className="text-ink">{selectedDate} at {selectedTime}</strong>
              </p>
              <p>
                <span className="text-ink-soft">{copy.confirmationStep.phoneLabel}</span>{" "}
                <strong className="text-ink">{contact.phone}</strong>
              </p>
            </div>

            <div className="mt-8">
              <Button href="/" variant="secondary">
                {copy.confirmationStep.returnHomeButton}
              </Button>
            </div>
          </Card>
        </div>
      ) : (
        /* Step-by-Step Scheduling Wizard */
        <div className="mx-auto max-w-2xl">
          {/* Stepper Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-ink-soft/70">
              <span className={step >= 0 ? "text-forest dark:text-emerald-400 font-bold" : ""}>
                {copy.steps.contact}
              </span>
              <span className="h-px flex-1 bg-line mx-2" />
              <span className={step >= 1 ? "text-forest dark:text-emerald-400 font-bold" : ""}>
                {copy.steps.service}
              </span>
              <span className="h-px flex-1 bg-line mx-2" />
              <span className={step >= 2 ? "text-forest dark:text-emerald-400 font-bold" : ""}>
                {copy.steps.clinic}
              </span>
              <span className="h-px flex-1 bg-line mx-2" />
              <span className={step >= 3 ? "text-forest dark:text-emerald-400 font-bold" : ""}>
                {copy.steps.doctorAndTime}
              </span>
              <span className="h-px flex-1 bg-line mx-2" />
              <span className={step >= 4 ? "text-forest dark:text-emerald-400 font-bold" : ""}>
                {copy.steps.notes}
              </span>
              <span className="h-px flex-1 bg-line mx-2" />
              <span className={step >= 5 ? "text-forest dark:text-emerald-400 font-bold" : ""}>
                {copy.steps.review}
              </span>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {/* Step 0: Contact Capture */}
            {step === 0 && (
              <motion.div
                key="step0"
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                <div>
                  <h1 className="text-[28px] sm:text-[34px] leading-tight text-ink font-normal">
                    {copy.contactStep.title}
                  </h1>
                  <p className="mt-2 text-sm text-ink-soft">{captureNotice}</p>
                </div>

                <div className="space-y-4">
                  <TextField
                    id="contact-name"
                    label={copy.contactStep.nameLabel}
                    value={contact.name}
                    placeholder={copy.contactStep.namePlaceholder}
                    required
                    error={touched.name ? errors.name : undefined}
                    onChange={(e) => setContact({ ...contact, name: e.target.value })}
                  />

                  <div>
                    <TextField
                      id="contact-phone"
                      label={copy.contactStep.phoneLabel}
                      type="tel"
                      value={contact.phone}
                      placeholder={copy.contactStep.phonePlaceholder}
                      required
                      disabled={isPhoneLocked}
                      error={touched.phone ? errors.phone : undefined}
                      onChange={(e) => setContact({ ...contact, phone: e.target.value })}
                    />
                    {isPhoneLocked && (
                      <div className="mt-1 flex items-center justify-between text-xs text-ink-soft/80">
                        <p className="flex items-center gap-1.5">
                          <Lock className="h-3 w-3 text-forest" />
                          <span>{copy.contactStep.phoneLockedNotice}</span>
                        </p>
                        <button
                          type="button"
                          onClick={() => setShowUnlockConfirm(true)}
                          className="font-medium text-forest hover:underline cursor-pointer ml-2"
                        >
                          Change number
                        </button>
                      </div>
                    )}
                    {showUnlockConfirm && (
                      <div className="mt-2 p-3 rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/40 text-xs text-amber-900 dark:text-amber-200 space-y-2">
                        <p className="font-medium">
                          Changing the phone number will decouple this booking from the caller&apos;s active contact hold. Are you sure?
                        </p>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setIsPhoneLocked(false);
                              setShowUnlockConfirm(false);
                            }}
                            className="px-2.5 py-1 rounded bg-amber-600 text-white font-medium hover:bg-amber-700 cursor-pointer"
                          >
                            Confirm change
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowUnlockConfirm(false)}
                            className="px-2.5 py-1 rounded border border-amber-400 bg-white dark:bg-stone-900 text-amber-900 dark:text-amber-200 cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  <TextField
                    id="contact-email"
                    label={copy.contactStep.emailLabel}
                    type="email"
                    value={contact.email}
                    placeholder={copy.contactStep.emailPlaceholder}
                    error={touched.email ? errors.email : undefined}
                    onChange={(e) => setContact({ ...contact, email: e.target.value })}
                  />
                </div>

                <div className="pt-4 flex justify-end">
                  <Button
                    data-testid="wizard-continue-btn"
                    variant="primary"
                    onClick={handleContactContinue}
                    isLoading={isSubmitting}
                    disabled={!contact.name || !contact.phone}
                  >
                    <span>{copy.contactStep.continueButton}</span>
                    <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Step 1: Service Selection */}
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                <div>
                  <h1 className="text-[28px] sm:text-[34px] leading-tight text-ink font-normal">
                    {copy.serviceStep.title}
                  </h1>
                  <p className="mt-2 text-sm text-ink-soft">{copy.serviceStep.subtitle}</p>
                </div>

                {services.length === 0 ? (
                  <div className="rounded-[var(--radius-card)] border border-amber-300 bg-amber-50 dark:bg-amber-950/40 p-4 text-sm text-amber-900 dark:text-amber-200">
                    {copy.serviceStep.emptyMessage}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3">
                    {services.map((svc) => {
                      const isSelected = selectedService === svc.id;
                      return (
                        <button
                          key={svc.id}
                          type="button"
                          data-testid={`service-option-${svc.id}`}
                          onClick={() => setSelectedService(svc.id)}
                          className={`w-full rounded-[var(--radius-card)] border p-4 text-left transition-all cursor-pointer ${
                            isSelected
                              ? "border-forest bg-forest text-[#FAF7F2] shadow-subtle"
                              : "border-line bg-cream/70 hover:border-forest/40 hover:bg-cream text-ink"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <p className="font-display text-[17px] font-medium leading-tight">
                              {svc.title}
                            </p>
                            <span
                              className={`text-xs font-mono ${
                                isSelected ? "text-[#FAF7F2]/80" : "text-ink-soft"
                              }`}
                            >
                              {svc.duration} · {formatPrice(svc.cashPrice, currency.symbol)}
                            </span>
                          </div>
                          {svc.shortDesc && (
                            <p
                              className={`mt-1.5 text-xs ${
                                isSelected ? "text-[#FAF7F2]/80" : "text-ink-soft"
                              }`}
                            >
                              {svc.shortDesc}
                            </p>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}

                <div className="pt-4 flex items-center justify-between">
                  <Button variant="secondary" onClick={handleBack}>
                    <ArrowLeft className="h-4 w-4 mr-1" />
                    <span>{copy.serviceStep.backButton}</span>
                  </Button>
                  <Button
                    data-testid="wizard-continue-btn"
                    variant="primary"
                    onClick={handleServiceContinue}
                    disabled={!selectedService}
                  >
                    <span>{copy.serviceStep.continueButton}</span>
                    <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Step 2: Clinic Location */}
            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                <div>
                  <h1 className="text-[28px] sm:text-[34px] leading-tight text-ink font-normal">
                    {copy.clinicStep.title}
                  </h1>
                  <p className="mt-2 text-sm text-ink-soft">{copy.clinicStep.subtitle}</p>
                </div>

                {clinics.length === 0 ? (
                  <div className="rounded-[var(--radius-card)] border border-amber-300 bg-amber-50 dark:bg-amber-950/40 p-4 text-sm text-amber-900 dark:text-amber-200">
                    {copy.clinicStep.emptyMessage}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3">
                    {clinics.map((cl) => {
                      const isSelected = selectedClinic === cl.id;
                      return (
                        <button
                          key={cl.id}
                          type="button"
                          data-testid={`clinic-option-${cl.id}`}
                          onClick={() => setSelectedClinic(cl.id)}
                          className={`w-full rounded-[var(--radius-card)] border p-4 text-left transition-all cursor-pointer ${
                            isSelected
                              ? "border-forest bg-forest text-[#FAF7F2] shadow-subtle"
                              : "border-line bg-cream/70 hover:border-forest/40 hover:bg-cream text-ink"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <p className="font-display text-[17px] font-medium leading-tight flex items-center gap-2">
                              <Building2 className="h-4 w-4 shrink-0" />
                              <span>{cl.name}</span>
                            </p>
                            {cl.isPrimary && (
                              <span
                                className={`text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full ${
                                  isSelected
                                    ? "bg-white/20 text-white"
                                    : "bg-forest/10 text-forest"
                                }`}
                              >
                                {copy.clinicStep.mainBranchBadge}
                              </span>
                            )}
                          </div>
                          <p
                            className={`mt-1 text-xs ${
                              isSelected ? "text-[#FAF7F2]/80" : "text-ink-soft"
                            }`}
                          >
                            {cl.addressLine1}, {cl.city} · Tel: {cl.phone}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                )}

                <div className="pt-4 flex items-center justify-between">
                  <Button variant="secondary" onClick={handleBack}>
                    <ArrowLeft className="h-4 w-4 mr-1" />
                    <span>{copy.clinicStep.backButton}</span>
                  </Button>
                  <Button
                    data-testid="wizard-continue-btn"
                    variant="primary"
                    onClick={handleClinicContinue}
                    disabled={!selectedClinic}
                  >
                    <span>{copy.clinicStep.continueButton}</span>
                    <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Step 3: Doctor & Free Times */}
            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                <div>
                  <h1 className="text-[28px] sm:text-[34px] leading-tight text-ink font-normal">
                    {copy.doctorStep.title}
                  </h1>
                  <p className="mt-2 text-sm text-ink-soft">{copy.doctorStep.subtitle}</p>
                </div>

                {doctors.length === 0 ? (
                  <div className="rounded-[var(--radius-card)] border border-amber-300 bg-amber-50 dark:bg-amber-950/40 p-4 text-sm text-amber-900 dark:text-amber-200">
                    {copy.doctorStep.noSlotsMessage}
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Auto-selected single doctor banner card */}
                    {doctorAutoState.isSingleDoctor && doctorAutoState.autoSelectedDoctor && (
                      <div
                        data-testid="single-doctor-intro"
                        className="rounded-[var(--radius-card)] border border-forest/30 bg-forest/5 dark:bg-forest/20 p-4 flex items-center gap-4"
                      >
                        {doctorAutoState.autoSelectedDoctor.photoUrl ? (
                          <img
                            src={doctorAutoState.autoSelectedDoctor.photoUrl}
                            alt={doctorAutoState.autoSelectedDoctor.displayName}
                            className="h-12 w-12 rounded-full object-cover border border-forest/20 shrink-0"
                          />
                        ) : (
                          <div className="h-12 w-12 rounded-full bg-forest text-white flex items-center justify-center font-display font-bold shrink-0">
                            {doctorAutoState.autoSelectedDoctor.displayName.charAt(0)}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-semibold uppercase tracking-wider text-forest dark:text-emerald-400">
                            {copy.doctorStep.singleDoctorIntro}
                          </p>
                          <h3 className="font-display font-semibold text-ink text-base">
                            {doctorAutoState.autoSelectedDoctor.displayName}
                          </h3>
                          <p className="text-xs text-ink-soft">
                            {doctorAutoState.autoSelectedDoctor.professionalTitle}
                          </p>
                        </div>
                        {doctorAutoState.autoSelectedDoctor.patientsTreated !== null && (
                          <span
                            data-testid="patients-treated-badge"
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 shrink-0"
                          >
                            <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
                            <span>
                              {doctorAutoState.autoSelectedDoctor.patientsTreated}{" "}
                              {copy.doctorStep.patientsTreated}
                            </span>
                          </span>
                        )}
                      </div>
                    )}

                    {doctors.map((doc) => {
                      const isDocSelected = selectedDoctor === doc.id;
                      const allDates = Object.keys(doc.slotsByDate || {}).sort();
                      const visibleDates = showAllDays ? allDates : allDates.slice(0, 3);

                      return (
                        <Card
                          key={doc.id}
                          data-testid={`doctor-card-${doc.id}`}
                          surface="cream"
                          shadow="subtle"
                          className={`p-5 border transition-all ${
                            isDocSelected
                              ? "border-forest ring-1 ring-forest/30"
                              : "border-line"
                          }`}
                        >
                          {/* Doctor Header */}
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex items-start gap-3.5">
                              {doc.photoUrl ? (
                                <img
                                  src={doc.photoUrl}
                                  alt={doc.displayName}
                                  className="h-12 w-12 rounded-full object-cover border border-line shrink-0"
                                />
                              ) : (
                                <div className="h-12 w-12 rounded-full bg-forest text-[#FAF7F2] flex items-center justify-center font-display font-semibold text-base shrink-0">
                                  {doc.displayName.charAt(0)}
                                </div>
                              )}
                              <div>
                                <h3 className="font-display text-lg font-semibold text-ink">
                                  {doc.displayName}
                                </h3>
                                <p className="text-xs text-ink-soft">{doc.professionalTitle}</p>
                                {doc.bio && (
                                  <p className="text-xs text-ink-soft/90 mt-1 line-clamp-2">
                                    {doc.bio}
                                  </p>
                                )}
                                <p className="text-[11px] text-ink-soft/80 mt-1 flex items-center gap-1">
                                  <Clock className="h-3 w-3 text-ink-soft/70" />
                                  <span>
                                    {copy.doctorStep.scheduleLabel} {doc.workingDaysHours}
                                  </span>
                                </p>
                              </div>
                            </div>

                            {/* Patients Treated Badge (shown if not null) */}
                            {doc.patientsTreated !== null && (
                              <span
                                data-testid="patients-treated-badge"
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 shrink-0"
                              >
                                <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
                                <span>
                                  {doc.patientsTreated} {copy.doctorStep.patientsTreated}
                                </span>
                              </span>
                            )}
                          </div>

                          {/* Slot Picker by Day */}
                          <div className="mt-5 pt-4 border-t border-line/60 space-y-3">
                            <div className="flex items-center justify-between">
                              <p className="text-xs font-semibold text-ink flex items-center gap-1.5">
                                <Calendar className="h-3.5 w-3.5 text-forest" />
                                <span>{copy.doctorStep.timesLabel}</span>
                              </p>
                              {allDates.length > 3 && (
                                <button
                                  type="button"
                                  onClick={() => setShowAllDays(!showAllDays)}
                                  className="text-xs font-medium text-forest dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
                                >
                                  <span>
                                    {showAllDays
                                      ? copy.doctorStep.showFewerDays
                                      : `${copy.doctorStep.showMoreDays} (${allDates.length})`}
                                  </span>
                                  {showAllDays ? (
                                    <ChevronUp className="h-3.5 w-3.5" />
                                  ) : (
                                    <ChevronDown className="h-3.5 w-3.5" />
                                  )}
                                </button>
                              )}
                            </div>

                            {allDates.length === 0 ? (
                              <p className="text-xs text-ink-soft italic">
                                {copy.doctorStep.noSlotsMessage}
                              </p>
                            ) : (
                              <div className="space-y-3">
                                {visibleDates.map((dStr) => {
                                  const slots = doc.slotsByDate[dStr] || [];
                                  return (
                                    <div
                                      key={dStr}
                                      data-testid="doctor-slot-date"
                                      className="space-y-1.5"
                                    >
                                      <p className="text-[11px] font-mono font-semibold text-ink-soft">
                                        {dStr}
                                      </p>
                                      <div className="flex flex-wrap gap-1.5">
                                        {slots.map((sTime) => {
                                          const isSlotActive =
                                            isDocSelected &&
                                            selectedDate === dStr &&
                                            selectedTime === sTime;
                                          return (
                                            <button
                                              key={sTime}
                                              type="button"
                                              data-testid={`slot-chip-${sTime}`}
                                              onClick={() => {
                                                setSelectedDoctor(doc.id);
                                                setSelectedDate(dStr);
                                                setSelectedTime(sTime);
                                              }}
                                              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all cursor-pointer ${
                                                isSlotActive
                                                  ? "bg-forest text-white shadow-sm"
                                                  : "bg-bone hover:bg-forest/10 border border-line text-ink"
                                              }`}
                                            >
                                              {sTime}
                                            </button>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                )}

                <div className="pt-4 flex items-center justify-between">
                  <Button variant="secondary" onClick={handleBack}>
                    <ArrowLeft className="h-4 w-4 mr-1" />
                    <span>{copy.doctorStep.backButton}</span>
                  </Button>
                  <Button
                    data-testid="wizard-continue-btn"
                    variant="primary"
                    onClick={handleDoctorTimeContinue}
                    disabled={!selectedDoctor || !selectedDate || !selectedTime}
                  >
                    <span>{copy.doctorStep.continueButton}</span>
                    <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Step 4: Notes and Booking For */}
            {step === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                <div>
                  <h1 className="text-[28px] sm:text-[34px] leading-tight text-ink font-normal">
                    {copy.notesStep.title}
                  </h1>
                  <p className="mt-2 text-sm text-ink-soft">{copy.notesStep.subtitle}</p>
                </div>

                <div className="space-y-4">
                  {/* Booking For Selector */}
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-soft/80 mb-2">
                      {copy.notesStep.bookingForLabel}
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        data-testid="booking-for-myself"
                        onClick={() => setBookingFor("myself")}
                        className={`p-3 rounded-[var(--radius-card)] border text-sm font-medium transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                          bookingFor === "myself"
                            ? "border-forest bg-forest text-white"
                            : "border-line bg-cream/70 text-ink"
                        }`}
                      >
                        <User className="h-4 w-4" />
                        <span>
                          {copy.notesStep.bookingForMyself} ({contact.name || "Self"})
                        </span>
                      </button>
                      <button
                        type="button"
                        data-testid="booking-for-other"
                        onClick={() => setBookingFor("other")}
                        className={`p-3 rounded-[var(--radius-card)] border text-sm font-medium transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                          bookingFor === "other"
                            ? "border-forest bg-forest text-white"
                            : "border-line bg-cream/70 text-ink"
                        }`}
                      >
                        <User className="h-4 w-4" />
                        <span>{copy.notesStep.bookingForSomeoneElse}</span>
                      </button>
                    </div>
                  </div>

                  {bookingFor === "other" && (
                    <TextField
                      id="patient-other-name"
                      label={copy.notesStep.patientNameLabel}
                      value={patientName}
                      placeholder={copy.notesStep.patientNamePlaceholder}
                      required
                      error={errors.patientName}
                      onChange={(e) => {
                        setPatientName(e.target.value);
                        if (errors.patientName) setErrors({});
                      }}
                    />
                  )}

                  <TextField
                    id="visit-notes"
                    label={copy.notesStep.notesLabel}
                    multiline
                    rows={3}
                    value={notes}
                    placeholder={copy.notesStep.notesPlaceholder}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>

                <div className="pt-4 flex items-center justify-between">
                  <Button variant="secondary" onClick={handleBack}>
                    <ArrowLeft className="h-4 w-4 mr-1" />
                    <span>{copy.notesStep.backButton}</span>
                  </Button>
                  <Button
                    data-testid="wizard-continue-btn"
                    variant="primary"
                    onClick={handleNotesContinue}
                  >
                    <span>{copy.notesStep.continueButton}</span>
                    <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Step 5: Review and Confirm */}
            {step === 5 && (
              <motion.div
                key="step5"
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                <div>
                  <h1 className="text-[28px] sm:text-[34px] leading-tight text-ink font-normal">
                    {copy.reviewStep.title}
                  </h1>
                  <p className="mt-2 text-sm text-ink-soft">{copy.reviewStep.subtitle}</p>
                </div>

                <Card surface="cream" shadow="subtle" className="p-6 space-y-3.5">
                  <div className="flex justify-between border-b border-line/60 pb-2.5 text-sm">
                    <span className="text-ink-soft">{copy.reviewStep.treatmentLabel}</span>
                    <strong className="text-ink font-display">{selectedServiceObj?.title}</strong>
                  </div>
                  <div className="flex justify-between border-b border-line/60 pb-2.5 text-sm">
                    <span className="text-ink-soft">{copy.reviewStep.clinicLabel}</span>
                    <strong className="text-ink">{selectedClinicObj?.name}</strong>
                  </div>
                  <div className="flex justify-between border-b border-line/60 pb-2.5 text-sm">
                    <span className="text-ink-soft">{copy.reviewStep.clinicianLabel}</span>
                    <strong className="text-ink">{selectedDoctorObj?.displayName}</strong>
                  </div>
                  <div className="flex justify-between border-b border-line/60 pb-2.5 text-sm">
                    <span className="text-ink-soft">{copy.reviewStep.dateTimeLabel}</span>
                    <strong className="text-ink font-mono">
                      {selectedDate} at {selectedTime}
                    </strong>
                  </div>
                  <div className="flex justify-between border-b border-line/60 pb-2.5 text-sm">
                    <span className="text-ink-soft">{copy.reviewStep.patientLabel}</span>
                    <strong className="text-ink">
                      {bookingFor === "other" && patientName
                        ? `${patientName} (${copy.reviewStep.bookedByLabel} ${contact.name})`
                        : contact.name}
                    </strong>
                  </div>
                  <div className="flex justify-between border-b border-line/60 pb-2.5 text-sm">
                    <span className="text-ink-soft">{copy.reviewStep.phoneLabel}</span>
                    <strong className="text-ink">{contact.phone}</strong>
                  </div>
                  {notes && (
                    <div className="pt-2 text-xs">
                      <span className="text-ink-soft font-semibold uppercase">
                        {copy.reviewStep.notesLabel}
                      </span>
                      <p className="mt-1 text-ink">{notes}</p>
                    </div>
                  )}
                </Card>

                {submitError && (
                  <div
                    role="alert"
                    className="rounded-[var(--radius-card)] border border-rose-200 bg-rose-50 dark:bg-rose-950/40 p-4 text-xs text-rose-800 dark:text-rose-200 space-y-2"
                  >
                    <p className="font-semibold text-rose-900 flex items-center gap-1.5 text-sm">
                      <XCircle className="h-4 w-4 text-rose-600 shrink-0" />
                      <span>{submitError}</span>
                    </p>
                    {submitError === copy.errors.slotTaken && (
                      <div className="pt-1">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => updateUrlStep(3)}
                        >
                          <span>Choose a different time</span>
                          <ArrowRight className="h-3.5 w-3.5 ml-1" />
                        </Button>
                      </div>
                    )}
                    {selectedClinicObj?.phone && (
                      <p className="text-[11px] text-rose-700">
                        {copy.errors.callClinicPrompt}{" "}
                        <a href={`tel:${selectedClinicObj.phone.replace(/[^0-9+]/g, "")}`} className="underline font-semibold">
                          {selectedClinicObj.phone}
                        </a>
                        .
                      </p>
                    )}
                  </div>
                )}

                <div className="rounded-[var(--radius-card)] border border-line bg-bone p-4 text-xs text-ink-soft flex items-start gap-2.5">
                  <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{copy.reviewStep.directConfirmationNotice}</span>
                </div>

                <div className="pt-4 flex items-center justify-between">
                  <Button
                    variant="secondary"
                    onClick={handleBack}
                    disabled={isSubmitting}
                  >
                    <ArrowLeft className="h-4 w-4 mr-1" />
                    <span>{copy.reviewStep.backButton}</span>
                  </Button>
                  <Button
                    data-testid="wizard-confirm-btn"
                    variant="primary"
                    onClick={handleFinalSubmit}
                    isLoading={isSubmitting}
                    disabled={isBookingPaused}
                  >
                    <span>{copy.reviewStep.confirmButton}</span>
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
