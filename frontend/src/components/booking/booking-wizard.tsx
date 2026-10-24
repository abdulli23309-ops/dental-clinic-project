"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence, useReducedMotion, type Transition } from "motion/react";
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
  MapPin,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { Card } from "@/components/ui/card";
import { StaggerList } from "@/components/ui/stagger-list";
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
  BOOKING_STEPS,
  FlowStep,
  groupClinicsByCity,
  getAvailableCities,
  getClinicsForCity,
  checkServiceSkip,
  checkDoctorAutoSelect,
  validateContactDetails,
  normalizeUrlStep,
  resetSelectionsOnServiceChange,
  resetSelectionsOnClinicChange,
  resetSelectionsOnDoctorChange,
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
  const shouldReduceMotion = useReducedMotion();

  const copy = bookingCopy.en;

  const urlStepParam = searchParams.get("step");
  const initialStep = normalizeUrlStep(urlStepParam);

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
  const [selectedCity, setSelectedCity] = useState<string>("");
  const [selectedClinic, setSelectedClinic] = useState<string>("");
  const [doctors, setDoctors] = useState<PublicBookingDoctorItem[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedTime, setSelectedTime] = useState<string>("");

  // Horizon state
  const [daysShownLimit, setDaysShownLimit] = useState<number>(7);
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

  // Synchronize URL step parameter
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
          if (typeof cfg.daysShown === "number" && cfg.daysShown > 0) {
            setDaysShownLimit(cfg.daysShown);
          }
        })
        .catch(() => {});

      getPublicBookingServices()
        .then((svcs) => {
          setServices(svcs);
          const serviceSkip = checkServiceSkip(svcs);
          if (
            preselectedServiceId &&
            svcs.some((s) => s.id === preselectedServiceId || s.slug === preselectedServiceId)
          ) {
            const match = svcs.find(
              (s) => s.id === preselectedServiceId || s.slug === preselectedServiceId
            );
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
        setSelectedCity("");
        setSelectedClinic("");
        return;
      }
      getPublicBookingClinics(selectedService)
        .then((cls) => {
          setClinics(cls);
          const availableCities = getAvailableCities(cls);

          if (cls.length === 1) {
            // Exactly one eligible clinic -> auto-select both city and clinic
            setSelectedCity(cls[0].city || "");
            setSelectedClinic(cls[0].id);
          } else if (availableCities.length === 1) {
            // Exactly one eligible city
            setSelectedCity(availableCities[0]);
            const cityClinics = getClinicsForCity(cls, availableCities[0]);
            if (cityClinics.length === 1) {
              setSelectedClinic(cityClinics[0].id);
            } else if (!cityClinics.some((c) => c.id === selectedClinic)) {
              setSelectedClinic("");
            }
          } else if (selectedCity && availableCities.includes(selectedCity)) {
            // Keep selected city if still eligible
            const cityClinics = getClinicsForCity(cls, selectedCity);
            if (cityClinics.length === 1) {
              setSelectedClinic(cityClinics[0].id);
            } else if (!cityClinics.some((c) => c.id === selectedClinic)) {
              setSelectedClinic("");
            }
          } else if (selectedClinic && cls.some((c) => c.id === selectedClinic)) {
            // Keep selected clinic and synchronize city
            const found = cls.find((c) => c.id === selectedClinic);
            if (found && found.city) {
              setSelectedCity(found.city);
            }
          } else {
            setSelectedCity("");
            setSelectedClinic("");
          }
        })
        .catch(() => {
          setClinics([]);
          setSelectedCity("");
          setSelectedClinic("");
        });
    });
  }, [selectedService, selectedClinic, selectedCity]);

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
  const contactValidation = useMemo(() => {
    return validateContactDetails(contact.name, contact.phone, contact.email);
  }, [contact.name, contact.phone, contact.email]);

  const validateContact = () => {
    const validation = validateContactDetails(contact.name, contact.phone, contact.email);
    const errs: Record<string, string> = {};
    if (validation.nameError) errs.name = copy.contactStep.nameError;
    if (validation.phoneError) errs.phone = copy.contactStep.phoneError;
    if (validation.emailError) errs.email = copy.contactStep.emailError;
    setErrors(errs);
    setTouched({ name: true, phone: true, email: true });
    return validation.isValid;
  };

  // Step 0 Continue: Save Lead
  const handleContactContinue = async () => {
    if (!validateContact()) return;
    if (isSubmitting) return;

    if (mode === "call_desk") {
      updateUrlStep(BOOKING_STEPS.SERVICE);
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
      updateUrlStep(BOOKING_STEPS.SERVICE);
    } catch {
      // Proceed even if offline
      updateUrlStep(BOOKING_STEPS.SERVICE);
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
    updateUrlStep(BOOKING_STEPS.LOCATION);
  };

  // Step 2 Continue: City / Clinic Location Selected
  const handleLocationContinue = async () => {
    if (!selectedClinic) return;
    if (captureToken && mode !== "call_desk") {
      publicLeadUpdate({ captureToken, clinicId: selectedClinic }).catch(() => {});
    }
    updateUrlStep(BOOKING_STEPS.DOCTOR);
  };

  // Step 3 Continue: Doctor Selected
  const handleDoctorContinue = async () => {
    if (!selectedDoctor) return;
    if (captureToken && mode !== "call_desk") {
      publicLeadUpdate({ captureToken, teamMemberId: selectedDoctor }).catch(() => {});
    }
    updateUrlStep(BOOKING_STEPS.DATETIME);
  };

  // Step 4 Continue: Date & Time Selected
  const handleDateTimeContinue = async () => {
    if (!selectedDate || !selectedTime) return;
    updateUrlStep(BOOKING_STEPS.REVIEW);
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

  // Grouped city calculations
  const cityGroups = useMemo(() => groupClinicsByCity(clinics), [clinics]);
  const availableCities = useMemo(() => getAvailableCities(clinics), [clinics]);
  const clinicsInChosenCity = useMemo(() => {
    if (!selectedCity) return clinics;
    return getClinicsForCity(clinics, selectedCity);
  }, [clinics, selectedCity]);

  // Date horizon calculations for Step 4
  const doctorDates = selectedDoctorObj?.slotsByDate
    ? Object.keys(selectedDoctorObj.slotsByDate).sort()
    : [];

  const visibleDates = showAllDays
    ? doctorDates
    : doctorDates.slice(0, Math.min(daysShownLimit, doctorDates.length));

  const transitionSettings: Transition = shouldReduceMotion
    ? { duration: 0 }
    : { duration: 0.22, ease: "easeOut" };

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
                <strong data-testid="booking-confirmation-code" className="text-ink font-bold">{submittedData.confirmationId}</strong>
              </p>
              <p>
                <span className="text-ink-soft">{copy.confirmationStep.branchLabel}</span>{" "}
                <strong className="text-ink">{selectedClinicObj?.name || ""}</strong>
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
        /* 6-Step Scheduling Wizard */
        <div className="mx-auto max-w-2xl">
          {/* Stepper Header */}
          <div className="mb-8" aria-label="Booking flow progress">
            <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-ink-soft/70 overflow-x-auto py-1">
              <span className={step >= BOOKING_STEPS.DETAILS ? "text-forest dark:text-emerald-400 font-bold" : ""}>
                {copy.steps.contact}
              </span>
              <span className="h-px flex-1 bg-line mx-2 min-w-3" />
              <span className={step >= BOOKING_STEPS.SERVICE ? "text-forest dark:text-emerald-400 font-bold" : ""}>
                {copy.steps.service}
              </span>
              <span className="h-px flex-1 bg-line mx-2 min-w-3" />
              <span className={step >= BOOKING_STEPS.LOCATION ? "text-forest dark:text-emerald-400 font-bold" : ""}>
                {copy.steps.city}
              </span>
              <span className="h-px flex-1 bg-line mx-2 min-w-3" />
              <span className={step >= BOOKING_STEPS.DOCTOR ? "text-forest dark:text-emerald-400 font-bold" : ""}>
                {copy.steps.doctor}
              </span>
              <span className="h-px flex-1 bg-line mx-2 min-w-3" />
              <span className={step >= BOOKING_STEPS.DATETIME ? "text-forest dark:text-emerald-400 font-bold" : ""}>
                {copy.steps.dateTime}
              </span>
              <span className="h-px flex-1 bg-line mx-2 min-w-3" />
              <span className={step >= BOOKING_STEPS.REVIEW ? "text-forest dark:text-emerald-400 font-bold" : ""}>
                {copy.steps.review}
              </span>
            </div>
          </div>

          <div className="min-h-[460px]">
            <AnimatePresence mode="wait">
              {/* Step 0: Patient Details */}
              {step === BOOKING_STEPS.DETAILS && (
                <motion.div
                  key="step0"
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -8 }}
                  transition={transitionSettings}
                  className="space-y-6"
                >
                  <div>
                    <h1 className="text-[28px] sm:text-[34px] leading-tight text-ink font-normal">
                      {copy.contactStep.title}
                    </h1>
                    <p className="mt-2 text-sm text-ink-soft">{captureNotice}</p>
                  </div>

                  <StaggerList className="space-y-4" stagger={0.1}>
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
                  </StaggerList>

                  {/* Smooth Continue Button reveal when contact details are valid */}
                  <div className="pt-4 flex justify-end min-h-[48px]">
                    <AnimatePresence>
                      {contactValidation.isValid && (
                        <motion.div
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -4 }}
                          transition={transitionSettings}
                        >
                          <Button
                            data-testid="wizard-continue-btn"
                            variant="primary"
                            onClick={handleContactContinue}
                            isLoading={isSubmitting}
                          >
                            <span>{copy.contactStep.continueButton}</span>
                            <ArrowRight className="h-4 w-4 ml-1" />
                          </Button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              )}

              {/* Step 1: Dental Service Selection */}
              {step === BOOKING_STEPS.SERVICE && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -8 }}
                  transition={transitionSettings}
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
                            onClick={() => {
                              if (selectedService !== svc.id) {
                                setSelectedService(svc.id);
                                const resets = resetSelectionsOnServiceChange();
                                setSelectedCity(resets.selectedCity);
                                setSelectedClinic(resets.selectedClinic);
                                setSelectedDoctor(resets.selectedDoctor);
                                setSelectedDate(resets.selectedDate);
                                setSelectedTime(resets.selectedTime);
                              }
                            }}
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

              {/* Step 2: City / Clinic Location */}
              {step === BOOKING_STEPS.LOCATION && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -8 }}
                  transition={transitionSettings}
                  className="space-y-6"
                >
                  <div>
                    <h1 className="text-[28px] sm:text-[34px] leading-tight text-ink font-normal">
                      {copy.cityStep.title}
                    </h1>
                    <p className="mt-2 text-sm text-ink-soft">{copy.cityStep.subtitle}</p>
                  </div>

                  {clinics.length === 0 ? (
                    <div className="rounded-[var(--radius-card)] border border-amber-300 bg-amber-50 dark:bg-amber-950/40 p-4 text-sm text-amber-900 dark:text-amber-200">
                      {copy.cityStep.emptyMessage}
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {/* City Selector (if multiple cities exist) */}
                      {availableCities.length > 1 && (
                        <div>
                          <label className="block text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-soft/80 mb-2.5">
                            {copy.cityStep.cityLabel}
                          </label>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {cityGroups.map(({ city, clinics: cityClinicList }) => {
                              const isCityActive =
                                selectedCity.toLowerCase() === city.toLowerCase();
                              const count = cityClinicList.length;
                              return (
                                <button
                                  key={city}
                                  type="button"
                                  data-testid={`city-option-${city}`}
                                  onClick={() => {
                                    setSelectedCity(city);
                                    const resets = resetSelectionsOnClinicChange();
                                    setSelectedDoctor(resets.selectedDoctor);
                                    setSelectedDate(resets.selectedDate);
                                    setSelectedTime(resets.selectedTime);
                                    if (count === 1) {
                                      setSelectedClinic(cityClinicList[0].id);
                                    } else if (!cityClinicList.some((c) => c.id === selectedClinic)) {
                                      setSelectedClinic("");
                                    }
                                  }}
                                  className={`rounded-[var(--radius-card)] border p-4 text-left transition-all cursor-pointer flex items-start gap-3 ${
                                    isCityActive
                                      ? "border-forest bg-forest text-white shadow-subtle"
                                      : "border-line bg-cream/70 hover:border-forest/40 hover:bg-cream text-ink"
                                  }`}
                                >
                                  <MapPin className={`h-5 w-5 shrink-0 mt-0.5 ${isCityActive ? "text-white" : "text-forest"}`} />
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between">
                                      <p className="font-display font-semibold text-base leading-tight">
                                        {city}
                                      </p>
                                      {isCityActive && <CheckCircle2 className="h-4 w-4 text-emerald-300 shrink-0 ml-1" />}
                                    </div>
                                    <p className={`text-xs mt-1 ${isCityActive ? "text-white/80" : "text-ink-soft"}`}>
                                      {count}{" "}
                                      {count === 1
                                        ? copy.cityStep.branchesCountSingular
                                        : copy.cityStep.branchesCountPlural}
                                    </p>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Clinic Branches List */}
                      <div>
                        {availableCities.length > 1 && (
                          <label className="block text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-soft/80 mb-2.5">
                            {copy.cityStep.clinicLabel}
                          </label>
                        )}
                        <div className="grid grid-cols-1 gap-3">
                          {clinicsInChosenCity.map((cl) => {
                            const isSelected = selectedClinic === cl.id;
                            return (
                              <button
                                key={cl.id}
                                type="button"
                                data-testid={`clinic-option-${cl.id}`}
                                onClick={() => {
                                  setSelectedClinic(cl.id);
                                  if (cl.city) setSelectedCity(cl.city);
                                  const resets = resetSelectionsOnClinicChange();
                                  setSelectedDoctor(resets.selectedDoctor);
                                  setSelectedDate(resets.selectedDate);
                                  setSelectedTime(resets.selectedTime);
                                }}
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
                      </div>
                    </div>
                  )}

                  <div className="pt-4 flex items-center justify-between">
                    <Button variant="secondary" onClick={handleBack}>
                      <ArrowLeft className="h-4 w-4 mr-1" />
                      <span>{copy.cityStep.backButton}</span>
                    </Button>
                    <Button
                      data-testid="wizard-continue-btn"
                      variant="primary"
                      onClick={handleLocationContinue}
                      disabled={!selectedClinic}
                    >
                      <span>{copy.cityStep.continueButton}</span>
                      <ArrowRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </motion.div>
              )}

              {/* Step 3: Doctor Selection */}
              {step === BOOKING_STEPS.DOCTOR && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -8 }}
                  transition={transitionSettings}
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
                      {copy.doctorStep.emptyMessage}
                    </div>
                  ) : (
                    <div className="space-y-4">
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

                      {/* Doctor Options */}
                      <div className="grid grid-cols-1 gap-3">
                        {doctors.map((doc) => {
                          const isDocSelected = selectedDoctor === doc.id;
                          return (
                            <button
                              key={doc.id}
                              type="button"
                              data-testid={`doctor-card-${doc.id}`}
                              onClick={() => {
                                if (selectedDoctor !== doc.id) {
                                  setSelectedDoctor(doc.id);
                                  const resets = resetSelectionsOnDoctorChange();
                                  setSelectedDate(resets.selectedDate);
                                  setSelectedTime(resets.selectedTime);
                                }
                              }}
                              className={`w-full rounded-[var(--radius-card)] border p-4 text-left transition-all cursor-pointer ${
                                isDocSelected
                                  ? "border-forest bg-forest/5 dark:bg-forest/20 ring-1 ring-forest/40"
                                  : "border-line bg-cream/70 hover:border-forest/40 hover:bg-cream"
                              }`}
                            >
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
                                    <div className="flex items-center gap-2">
                                      <h3 className="font-display text-lg font-semibold text-ink">
                                        {doc.displayName}
                                      </h3>
                                      {isDocSelected && (
                                        <CheckCircle2 className="h-4 w-4 text-forest dark:text-emerald-400" />
                                      )}
                                    </div>
                                    <p className="text-xs text-ink-soft">{doc.professionalTitle}</p>
                                    {doc.bio && (
                                      <p className="text-xs text-ink-soft/90 mt-1 line-clamp-2">
                                        {doc.bio}
                                      </p>
                                    )}
                                    <p className="text-[11px] text-ink-soft/80 mt-1.5 flex items-center gap-1">
                                      <Clock className="h-3 w-3 text-ink-soft/70" />
                                      <span>
                                        {copy.doctorStep.scheduleLabel} {doc.workingDaysHours}
                                      </span>
                                    </p>
                                  </div>
                                </div>

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
                            </button>
                          );
                        })}
                      </div>
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
                      onClick={handleDoctorContinue}
                      disabled={!selectedDoctor}
                    >
                      <span>{copy.doctorStep.continueButton}</span>
                      <ArrowRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </motion.div>
              )}

              {/* Step 4: Date & Time */}
              {step === BOOKING_STEPS.DATETIME && (
                <motion.div
                  key="step4"
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -8 }}
                  transition={transitionSettings}
                  className="space-y-6"
                >
                  <div>
                    <h1 className="text-[28px] sm:text-[34px] leading-tight text-ink font-normal">
                      {copy.dateTimeStep.title}
                    </h1>
                    <p className="mt-2 text-sm text-ink-soft">{copy.dateTimeStep.subtitle}</p>
                  </div>

                  <Card surface="cream" shadow="subtle" className="p-5 border border-line space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-forest" />
                        <h3 className="font-display font-semibold text-sm text-ink">
                          {selectedDoctorObj?.displayName || "Doctor"} — {copy.dateTimeStep.timesLabel}
                        </h3>
                      </div>
                      {doctorDates.length > daysShownLimit && (
                        <button
                          type="button"
                          onClick={() => setShowAllDays(!showAllDays)}
                          className="text-xs font-medium text-forest dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <span>
                            {showAllDays
                              ? copy.dateTimeStep.showFewerDays
                              : `${copy.dateTimeStep.showMoreDays} (${doctorDates.length})`}
                          </span>
                          {showAllDays ? (
                            <ChevronUp className="h-3.5 w-3.5" />
                          ) : (
                            <ChevronDown className="h-3.5 w-3.5" />
                          )}
                        </button>
                      )}
                    </div>

                    {doctorDates.length === 0 ? (
                      <p className="text-xs text-ink-soft italic">
                        {copy.dateTimeStep.noSlotsMessage}
                      </p>
                    ) : (
                      <div className="space-y-4">
                        {visibleDates.map((dStr) => {
                          const slots = selectedDoctorObj?.slotsByDate[dStr] || [];
                          return (
                            <div
                              key={dStr}
                              data-testid="doctor-slot-date"
                              className="rounded-lg border border-line/60 bg-bone/60 p-3 space-y-2"
                            >
                              <p className="text-xs font-mono font-semibold text-ink flex items-center gap-1.5">
                                <Clock className="h-3.5 w-3.5 text-forest" />
                                <span>{dStr}</span>
                              </p>
                              <div className="flex flex-wrap gap-2">
                                {slots.map((sTime) => {
                                  const isSlotActive =
                                    selectedDate === dStr && selectedTime === sTime;
                                  return (
                                    <button
                                      key={sTime}
                                      type="button"
                                      data-testid={`slot-chip-${sTime}`}
                                      onClick={() => {
                                        setSelectedDate(dStr);
                                        setSelectedTime(sTime);
                                      }}
                                      className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all cursor-pointer ${
                                        isSlotActive
                                          ? "bg-forest text-white shadow-sm"
                                          : "bg-white dark:bg-stone-800 hover:bg-forest/10 border border-line text-ink"
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
                  </Card>

                  <div className="pt-4 flex items-center justify-between">
                    <Button variant="secondary" onClick={handleBack}>
                      <ArrowLeft className="h-4 w-4 mr-1" />
                      <span>{copy.dateTimeStep.backButton}</span>
                    </Button>
                    <Button
                      data-testid="wizard-continue-btn"
                      variant="primary"
                      onClick={handleDateTimeContinue}
                      disabled={!selectedDate || !selectedTime}
                    >
                      <span>{copy.dateTimeStep.continueButton}</span>
                      <ArrowRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </motion.div>
              )}

              {/* Step 5: Notes, Review & Confirmation */}
              {step === BOOKING_STEPS.REVIEW && (
                <motion.div
                  key="step5"
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -8 }}
                  transition={transitionSettings}
                  className="space-y-6"
                >
                  <div>
                    <h1 className="text-[28px] sm:text-[34px] leading-tight text-ink font-normal">
                      {copy.reviewStep.title}
                    </h1>
                    <p className="mt-2 text-sm text-ink-soft">{copy.reviewStep.subtitle}</p>
                  </div>

                  {/* Booking For Selector & Notes */}
                  <div className="space-y-4">
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
                      rows={2}
                      value={notes}
                      placeholder={copy.notesStep.notesPlaceholder}
                      onChange={(e) => setNotes(e.target.value)}
                    />
                  </div>

                  {/* Itemized Review Summary */}
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
                            onClick={() => updateUrlStep(BOOKING_STEPS.DATETIME)}
                          >
                            <span>Choose a different time</span>
                            <ArrowRight className="h-3.5 w-3.5 ml-1" />
                          </Button>
                        </div>
                      )}
                      {selectedClinicObj?.phone && (
                        <p className="text-[11px] text-rose-700">
                          {copy.errors.callClinicPrompt}{" "}
                          <a
                            href={`tel:${selectedClinicObj.phone.replace(/[^0-9+]/g, "")}`}
                            className="underline font-semibold"
                          >
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
                    <Button variant="secondary" onClick={handleBack} disabled={isSubmitting}>
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
        </div>
      )}
    </div>
  );
}
