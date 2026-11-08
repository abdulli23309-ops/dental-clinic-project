"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Phone,
  PhoneCall,
  PhoneOff,
  User,
  Users,
  UserPlus,
  Clock,
  Calendar,
  MessageSquare,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  Lock,
  ArrowRight,
  X,
  History,
  ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { TextField } from "@/components/ui/text-field";
import { BookingWizard } from "@/components/booking/booking-wizard";
import { AnimatedPage } from "@/components/ui/animated-page";
import {
  lookupCallDesk,
  startCallDeskHold,
  releaseCallDeskHold,
  recordCallDeskOutcome,
  CallDeskLookupData,
  CallDeskPatient,
  CallDeskLead,
  CallDeskHold,
} from "@/lib/api";

const OUTCOMES = [
  { value: "booked", label: "Appointment Booked", desc: "Successfully scheduled an appointment" },
  { value: "callback_requested", label: "Callback Requested", desc: "Patient asked to be called back" },
  { value: "dropped", label: "Call Dropped / Cut Off", desc: "Disconnected before finishing" },
  { value: "wrong_number", label: "Wrong Number", desc: "Caller dialed the wrong clinic/number" },
  { value: "not_interested", label: "Not Interested", desc: "Declined treatment or consultation" },
  { value: "info_only", label: "Information Only", desc: "Inquired about prices, hours, or services" },
];

export default function ReceptionCallDeskPage() {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [lookupData, setLookupData] = useState<CallDeskLookupData | null>(null);
  const [selectedPatient, setSelectedPatient] = useState<CallDeskPatient | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Active Hold & Timer
  const [activeHold, setActiveHold] = useState<CallDeskHold | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Modals
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showEndCallModal, setShowEndCallModal] = useState(false);
  const [isSubmittingOutcome, setIsSubmittingOutcome] = useState(false);

  // Outcome Form State
  const [selectedOutcome, setSelectedOutcome] = useState("booked");
  const [callNotes, setCallNotes] = useState("");
  const [droppedName, setDroppedName] = useState("");
  const [droppedEmail, setDroppedEmail] = useState("");

  // Booking success confirmation
  const [bookingNotice, setBookingNotice] = useState<string | null>(null);

  // Decrement hold timer each second
  useEffect(() => {
    if (activeHold && remainingSeconds > 0) {
      timerRef.current = setInterval(() => {
        setRemainingSeconds((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current as NodeJS.Timeout);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [activeHold, remainingSeconds]);

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleSearch = useCallback(async (phoneToSearch?: string) => {
    const target = phoneToSearch || phoneNumber;
    if (!target || target.trim().length < 3) {
      setError("Please enter a valid phone number.");
      return;
    }
    setError(null);
    setIsSearching(true);
    setBookingNotice(null);
    try {
      const data = await lookupCallDesk(target.trim());
      setLookupData(data);
      if (data.patients && data.patients.length > 0) {
        setSelectedPatient(data.patients[0]);
      } else {
        setSelectedPatient(null);
      }
      if (data.activeHold && data.activeHold.isActive) {
        setActiveHold(data.activeHold);
        setRemainingSeconds(data.activeHold.remainingSeconds);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Lookup failed";
      setError(msg);
    } finally {
      setIsSearching(false);
    }
  }, [phoneNumber]);

  const handleStartHold = async (minutes: number = 30) => {
    const phone = lookupData?.phoneNormalized || phoneNumber;
    if (!phone) return;
    setError(null);
    try {
      const hold = await startCallDeskHold(phone, minutes, "call_desk");
      setActiveHold(hold);
      setRemainingSeconds(hold.remainingSeconds);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to place hold";
      setError(msg);
    }
  };

  const handleExtendHold = async () => {
    await handleStartHold(30);
  };

  const handleEndCallClick = () => {
    setShowEndCallModal(true);
  };

  const handleConfirmEndCall = async () => {
    const phone = lookupData?.phoneNormalized || phoneNumber;
    if (!phone) return;
    setIsSubmittingOutcome(true);
    setError(null);
    try {
      await recordCallDeskOutcome({
        phone: phone,
        outcome: selectedOutcome,
        notes: callNotes.trim() || undefined,
        leadCapture:
          selectedOutcome === "dropped" && (droppedName || droppedEmail)
            ? {
                name: droppedName.trim() || undefined,
                email: droppedEmail.trim() || undefined,
              }
            : undefined,
        leadId: lookupData?.leads?.[0]?.id,
        patientId: selectedPatient?.id,
      });

      // Reset Call State
      setActiveHold(null);
      setRemainingSeconds(0);
      setShowEndCallModal(false);
      setCallNotes("");
      setDroppedName("");
      setDroppedEmail("");

      // Refresh lookup
      await handleSearch(phone);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to end call";
      setError(msg);
    } finally {
      setIsSubmittingOutcome(false);
    }
  };

  const handleBookingFinished = async (confirmation: { confirmationId: string; patientName: string; dateTime: string }) => {
    setBookingNotice(`Appointment successfully booked: Reference #${confirmation.confirmationId} for ${confirmation.patientName} on ${confirmation.dateTime}.`);
    setShowBookingModal(false);
    setSelectedOutcome("booked");
    // Refresh caller data
    const phone = lookupData?.phoneNormalized || phoneNumber;
    if (phone) {
      await handleSearch(phone);
    }
  };

  return (
  <AnimatedPage>
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-line pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-lg bg-forest/10 text-forest dark:bg-emerald-950/60 dark:text-emerald-400">
              <PhoneCall className="h-5 w-5" />
            </span>
            <h1 className="text-2xl font-semibold text-ink">Reception Call Desk</h1>
          </div>
          <p className="mt-1 text-sm text-ink-soft">
            Live caller lookup, contact hold protection for automated sequences, and rapid booking.
          </p>
        </div>
      </div>

      {/* Active Call Status Bar */}
      {activeHold && remainingSeconds > 0 && (
        <div
          data-testid="call-desk-active-banner"
          className="rounded-[var(--radius-card)] border border-emerald-500/40 bg-emerald-50 dark:bg-emerald-950/40 p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in duration-200"
        >
          <div className="flex items-center gap-3">
            <span className="relative flex h-3.5 w-3.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-600"></span>
            </span>
            <div>
              <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-200 flex items-center gap-2">
                <span>Active Call in Progress</span>
                <span className="text-xs font-mono font-normal opacity-80">
                  (Hold blocks recovery messages to {activeHold.phoneNormalized})
                </span>
              </p>
              <p className="text-xs text-emerald-800 dark:text-emerald-300">
                Hold remaining:{" "}
                <span data-testid="call-desk-timer" className="font-mono font-bold text-sm">
                  {formatTimer(remainingSeconds)}
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              data-testid="call-desk-extend-btn"
              variant="secondary"
              size="sm"
              onClick={handleExtendHold}
            >
              Extend (+30m)
            </Button>
            <Button
              data-testid="call-desk-book-btn"
              variant="primary"
              size="sm"
              onClick={() => setShowBookingModal(true)}
            >
              Book Appointment
            </Button>
            <Button
              data-testid="call-desk-end-btn"
              variant="secondary"
              className="text-rose-600 dark:text-rose-400 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40"
              size="sm"
              onClick={handleEndCallClick}
            >
              <PhoneOff className="h-4 w-4 mr-1.5" />
              <span>End Call</span>
            </Button>
          </div>
        </div>
      )}

      {/* Booking Notice Alert */}
      {bookingNotice && (
        <div className="rounded-[var(--radius-card)] border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30 p-4 text-sm text-emerald-900 dark:text-emerald-200 flex items-start gap-3">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-medium">{bookingNotice}</p>
          </div>
          <button
            onClick={() => setBookingNotice(null)}
            className="text-emerald-700 hover:text-emerald-900 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Number Box / Search Panel */}
      <Card surface="cream" shadow="subtle" className="p-6" hoverLift={true} index={0}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSearch();
          }}
          className="space-y-4"
        >
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <TextField
                id="call-desk-phone-input"
                data-testid="call-desk-phone-input"
                label="Caller Phone Number"
                placeholder="e.g. 0300 1234567 or 923001234567"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                error={error || undefined}
              />
            </div>
            <div className="sm:pt-6 flex gap-2">
              <Button
                data-testid="call-desk-search-btn"
                variant="primary"
                type="submit"
                isLoading={isSearching}
              >
                <Phone className="h-4 w-4 mr-1.5" />
                <span>Lookup Caller</span>
              </Button>
              {lookupData && (
                <Button
                  variant="secondary"
                  type="button"
                  onClick={() => {
                    setLookupData(null);
                    setPhoneNumber("");
                    setSelectedPatient(null);
                    setError(null);
                  }}
                >
                  Clear
                </Button>
              )}
            </div>
          </div>
        </form>
      </Card>

      {/* Results Panel */}
      {lookupData && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Quick Actions if Not On Active Hold */}
          {(!activeHold || remainingSeconds === 0) && (
            <div className="flex items-center justify-between p-4 rounded-[var(--radius-card)] bg-bone border border-line">
              <div className="flex items-center gap-2">
                <PhoneCall className="h-4 w-4 text-ink-soft" />
                <span className="text-sm font-medium text-ink">
                  Caller: <span className="font-mono font-bold">{lookupData.phoneNormalized}</span>
                </span>
              </div>
              <div className="flex items-center gap-2.5">
                <Button
                  data-testid="call-desk-start-btn"
                  variant="primary"
                  size="sm"
                  onClick={() => handleStartHold(30)}
                >
                  <PhoneCall className="h-4 w-4 mr-1.5" />
                  <span>Start Call (Place Hold)</span>
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowBookingModal(true)}
                >
                  Book Appointment
                </Button>
              </div>
            </div>
          )}

          {/* Caller Profile Card (Patients / Leads) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              {/* Patient / Family Selection Card */}
              <Card surface="cream" shadow="subtle" className="p-6 space-y-4" hoverLift={true} index={1}>
                <div className="flex items-center justify-between border-b border-line/60 pb-3">
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-forest" />
                    <h2 className="text-base font-semibold text-ink">Registered Patients</h2>
                  </div>
                  {lookupData.patients.length > 0 ? (
                    <span
                      data-testid="patient-badge"
                      className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                    >
                      {lookupData.patients.length} Patient{lookupData.patients.length > 1 ? "s" : ""}
                    </span>
                  ) : (
                    <span className="text-xs text-ink-soft italic">No patient found</span>
                  )}
                </div>

                {lookupData.patients.length > 0 ? (
                  <div className="space-y-3">
                    {lookupData.patients.length > 1 && (
                      <p className="text-xs font-semibold text-ink-soft">
                        Several family members share this phone number. Select active caller:
                      </p>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {lookupData.patients.map((pat) => {
                        const isSelected = selectedPatient?.id === pat.id;
                        return (
                          <div
                            key={pat.id}
                            data-testid="family-member-card"
                            onClick={() => setSelectedPatient(pat)}
                            className={`p-3.5 rounded-[var(--radius-card)] border text-left cursor-pointer transition-all ${
                              isSelected
                                ? "border-forest bg-forest/5 shadow-sm dark:border-emerald-500/60"
                                : "border-line bg-bone hover:border-forest/40"
                            }`}
                          >
                            <div className="flex items-start justify-between">
                              <p className="font-semibold text-sm text-ink">{pat.fullName}</p>
                              {isSelected && (
                                <span className="text-[11px] font-bold text-forest uppercase tracking-wider">
                                  Selected
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-ink-soft font-mono mt-1">{pat.phone}</p>
                            {pat.email && (
                              <p className="text-xs text-ink-soft truncate mt-0.5">{pat.email}</p>
                            )}
                            {pat.medicalAlertCount > 0 && (
                              <div className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                                <ShieldAlert className="h-3 w-3" />
                                <span>{pat.medicalAlertCount} Medical Alert{pat.medicalAlertCount > 1 ? "s" : ""}</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-ink-soft">
                    This phone number does not belong to any existing patient chart.
                  </p>
                )}
              </Card>

              {/* Lead / Acquisition History Card */}
              <Card surface="cream" shadow="subtle" className="p-6 space-y-4" hoverLift={true} index={2}>
                <div className="flex items-center justify-between border-b border-line/60 pb-3">
                  <div className="flex items-center gap-2">
                    <UserPlus className="h-5 w-5 text-amber-600" />
                    <h2 className="text-base font-semibold text-ink">Lead Details & Journey</h2>
                  </div>
                  {lookupData.leads.length > 0 ? (
                    <span
                      data-testid="lead-badge"
                      className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                    >
                      Lead: {lookupData.leads[0].status}
                    </span>
                  ) : (
                    <span className="text-xs text-ink-soft italic">No open lead</span>
                  )}
                </div>

                {lookupData.leads.length > 0 ? (
                  <div className="space-y-4">
                    {lookupData.leads.map((ld) => (
                      <div key={ld.id} className="space-y-3">
                        <div className="flex flex-wrap items-center justify-between text-xs text-ink-soft gap-2">
                          <div>
                            <span className="font-semibold text-ink">Name:</span> {ld.fullName || "Unspecified"}
                            {ld.email && <span className="ml-3 font-semibold text-ink">Email: {ld.email}</span>}
                          </div>
                          <div>
                            <span className="font-semibold text-ink">Source:</span>{" "}
                            <span className="font-mono bg-bone px-2 py-0.5 rounded border border-line">
                              {ld.source || "organic"}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 text-xs text-ink-soft">
                          <p>
                            Attempts logged: <strong className="text-ink">{ld.attempts}</strong>
                          </p>
                          {ld.consentNoticeVersion && (
                            <p>
                              Consent Notice: <span className="font-mono">{ld.consentNoticeVersion}</span>
                            </p>
                          )}
                        </div>

                        {/* Events list */}
                        {ld.events && ld.events.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-line/60 space-y-2">
                            <p className="text-xs font-semibold text-ink">Lead Events:</p>
                            <div className="space-y-1.5 font-mono text-xs">
                              {ld.events.map((ev) => (
                                <div
                                  key={ev.id}
                                  className="flex items-center justify-between p-2 rounded bg-bone border border-line/70"
                                >
                                  <span className="text-ink font-medium">{ev.eventType}</span>
                                  <span className="text-ink-soft text-[11px]">
                                    {new Date(ev.createdAt).toLocaleString()}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-ink-soft">
                    No active leads registered for this phone number.
                  </p>
                )}
              </Card>

              {/* History Timeline */}
              <Card surface="cream" shadow="subtle" className="p-6 space-y-4" hoverLift={true} index={3}>
                <div className="flex items-center gap-2 border-b border-line/60 pb-3">
                  <History className="h-5 w-5 text-forest" />
                  <h2 className="text-base font-semibold text-ink">Recent Communications Timeline</h2>
                </div>

                {lookupData.recentMessages.length === 0 ? (
                  <p className="text-sm text-ink-soft italic">No recent messages recorded for this number.</p>
                ) : (
                  <div className="space-y-2.5">
                    {lookupData.recentMessages.slice(0, 8).map((msg) => (
                      <div
                        key={msg.id}
                        className="p-3 rounded-[var(--radius-card)] bg-bone border border-line text-xs space-y-1"
                      >
                        <div className="flex items-center justify-between text-ink-soft">
                          <span className="font-semibold uppercase text-ink">
                            {msg.direction} • {msg.channel} ({msg.purpose})
                          </span>
                          <span className="font-mono text-[11px]">
                            {new Date(msg.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-ink">{msg.content}</p>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>

            {/* Right Column: Upcoming Bookings & Fast Action */}
            <div className="space-y-6">
              <Card surface="cream" shadow="subtle" className="p-6 space-y-4" hoverLift={true} index={4}>
                <div className="flex items-center justify-between border-b border-line/60 pb-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-forest" />
                    <h2 className="text-base font-semibold text-ink">Upcoming Bookings</h2>
                  </div>
                  <span className="text-xs font-mono font-semibold text-forest">
                    {lookupData.upcomingBookings.length}
                  </span>
                </div>

                {lookupData.upcomingBookings.length === 0 ? (
                  <p className="text-xs text-ink-soft italic">No upcoming appointments on file.</p>
                ) : (
                  <div className="space-y-3">
                    {lookupData.upcomingBookings.map((b) => (
                      <div
                        key={b.id}
                        className="p-3 rounded-[var(--radius-card)] border border-line bg-bone space-y-1 text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-ink">{b.serviceName || "Consultation"}</span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 uppercase">
                            {b.status}
                          </span>
                        </div>
                        <p className="text-ink-soft">
                          {b.preferredDate} at {b.preferredTime}
                        </p>
                        <p className="text-ink-soft">
                          Clinician: {b.doctorName || "Assigned Doctor"} • {b.clinicName || "Clinic"}
                        </p>
                        <p className="font-mono text-[11px] text-ink-soft pt-1">
                          Ref: {b.confirmationId}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                <div className="pt-2">
                  <Button
                    variant="primary"
                    className="w-full"
                    onClick={() => setShowBookingModal(true)}
                  >
                    <Calendar className="h-4 w-4 mr-1.5" />
                    <span>Book New Appointment</span>
                  </Button>
                </div>
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* Booking Wizard Modal */}
      {showBookingModal && (
        <div
          data-testid="call-desk-booking-modal"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto"
        >
          <div className="relative w-full max-w-3xl bg-white dark:bg-stone-900 rounded-[var(--radius-card)] shadow-xl p-6 sm:p-8 my-8 max-h-[90vh] overflow-y-auto">
            <button
              data-testid="call-desk-close-booking-modal"
              onClick={() => setShowBookingModal(false)}
              className="absolute top-4 right-4 text-ink-soft hover:text-ink cursor-pointer p-1 rounded-full hover:bg-bone"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="mb-6 pb-4 border-b border-line">
              <h2 className="text-xl font-bold text-ink">Call Desk Scheduling</h2>
              <p className="text-xs text-ink-soft mt-1">
                Scheduling appointment for caller number{" "}
                <span className="font-mono font-semibold text-ink">
                  {lookupData?.phoneNormalized || phoneNumber}
                </span>{" "}
                (locked).
              </p>
            </div>

            <BookingWizard
              mode="call_desk"
              initialPhone={lookupData?.phoneNormalized || phoneNumber}
              initialPatientName={selectedPatient?.fullName || lookupData?.leads?.[0]?.fullName || ""}
              initialEmail={selectedPatient?.email || lookupData?.leads?.[0]?.email || ""}
              lockPhone={true}
              onBookingComplete={handleBookingFinished}
            />
          </div>
        </div>
      )}

      {/* End Call Modal */}
      {showEndCallModal && (
        <div
          data-testid="end-call-modal"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto"
        >
          <div className="relative w-full max-w-md bg-white dark:bg-stone-900 rounded-[var(--radius-card)] shadow-xl p-6 space-y-5 my-auto max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div className="flex items-center gap-2">
                <PhoneOff className="h-5 w-5 text-rose-600" />
                <h2 className="text-lg font-bold text-ink">End Call & Record Outcome</h2>
              </div>
              <button
                onClick={() => setShowEndCallModal(false)}
                className="text-ink-soft hover:text-ink cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-ink block mb-2">
                  Select Call Outcome <span className="text-rose-500">*</span>
                </label>
                <div className="space-y-2">
                  {OUTCOMES.map((opt) => (
                    <label
                      key={opt.value}
                      className={`flex items-start gap-2.5 p-2.5 rounded-lg border text-xs cursor-pointer transition-all ${
                        selectedOutcome === opt.value
                          ? "border-forest bg-forest/5 text-ink font-medium"
                          : "border-line bg-bone hover:border-forest/40 text-ink-soft"
                      }`}
                    >
                      <input
                        type="radio"
                        name="call-outcome"
                        value={opt.value}
                        checked={selectedOutcome === opt.value}
                        onChange={(e) => setSelectedOutcome(e.target.value)}
                        className="mt-0.5 text-forest focus:ring-forest"
                      />
                      <div>
                        <p className="font-semibold text-ink">{opt.label}</p>
                        <p className="text-[11px] text-ink-soft">{opt.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Special Dropped Call Details Section */}
              {selectedOutcome === "dropped" && (
                <div
                  data-testid="dropped-call-capture-box"
                  className="p-3.5 rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/40 text-xs space-y-3"
                >
                  <p className="font-semibold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                    <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
                    <span>Did you collect caller details before the line dropped?</span>
                  </p>
                  <p className="text-[11px] text-amber-800 dark:text-amber-300">
                    If contact details were collected, Marlow will save an unconverted lead so the follow-up sequence can resume. If left blank, no lead is created.
                  </p>
                  <div className="space-y-2">
                    <TextField
                      id="dropped-lead-name"
                      data-testid="dropped-lead-name"
                      label="Caller Name (Optional)"
                      placeholder="e.g. Sara Ali"
                      value={droppedName}
                      onChange={(e) => setDroppedName(e.target.value)}
                    />
                    <TextField
                      id="dropped-lead-email"
                      data-testid="dropped-lead-email"
                      label="Caller Email (Optional)"
                      type="email"
                      placeholder="e.g. sara@example.com"
                      value={droppedEmail}
                      onChange={(e) => setDroppedEmail(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {/* Call Notes */}
              <div>
                <TextField
                  id="call-desk-notes"
                  data-testid="call-desk-notes"
                  label="Call Notes (Optional)"
                  multiline
                  rows={2}
                  placeholder="Notes on caller inquiries, questions, or concerns..."
                  value={callNotes}
                  onChange={(e) => setCallNotes(e.target.value)}
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2.5">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowEndCallModal(false)}
                disabled={isSubmittingOutcome}
              >
                Cancel
              </Button>
              <Button
                data-testid="call-desk-submit-outcome-btn"
                variant="primary"
                size="sm"
                onClick={handleConfirmEndCall}
                isLoading={isSubmittingOutcome}
              >
                <span>Save Outcome & Release Hold</span>
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  </AnimatedPage>
  );
}
