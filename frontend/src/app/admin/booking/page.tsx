"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Calendar,
  Check,
  Clock,
  Edit2,
  Info,
  Pause,
  Play,
  Plus,
  RefreshCw,
  Trash2,
  UserCheck,
  X,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { TextField } from "@/components/ui/text-field";
import { useAuth } from "@/components/providers/auth-provider";
import {
  adminCreateClosure,
  adminCreateRescheduleTasks,
  adminDeleteClosure,
  adminGetBookingSettings,
  adminGetClosures,
  adminGetWorkingHours,
  adminUpdateBookingMode,
  adminUpdateClosure,
  adminUpdateWorkingHours,
  AdminBookingSettings,
  AffectedBookingItem,
  ClinicClosureItem,
  WorkingHoursItem,
} from "@/lib/api";

const DAY_NAMES = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

export default function AdminBookingPage() {
  const { accessToken } = useAuth();

  // Settings State
  const [settings, setSettings] = useState<AdminBookingSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Mode Change Form & Modal
  const [targetMode, setTargetMode] = useState<"open" | "paused" | "closed">("open");
  const [modeMessage, setModeMessage] = useState("");
  const [resumeOn, setResumeOn] = useState("");
  const [showModeConfirm, setShowModeConfirm] = useState(false);
  const [isUpdatingMode, setIsUpdatingMode] = useState(false);

  // Affected Bookings & Reschedule Tasks Modal
  const [affectedBookings, setAffectedBookings] = useState<AffectedBookingItem[]>([]);
  const [showAffectedModal, setShowAffectedModal] = useState(false);
  const [isCreatingTasks, setIsCreatingTasks] = useState(false);
  const [tasksCreatedCount, setTasksCreatedCount] = useState<number | null>(null);

  // Working Hours State
  const [workingHours, setWorkingHours] = useState<WorkingHoursItem[]>([]);
  const [hoursSaving, setHoursSaving] = useState(false);

  // Closures State
  const [closures, setClosures] = useState<ClinicClosureItem[]>([]);
  const [closureModalOpen, setClosureModalOpen] = useState(false);
  const [editingClosure, setEditingClosure] = useState<ClinicClosureItem | null>(null);
  const [closureStart, setClosureStart] = useState("");
  const [closureEnd, setClosureEnd] = useState("");
  const [closureReason, setClosureReason] = useState("");
  const [closureMessage, setClosureMessage] = useState("");
  const [isSavingClosure, setIsSavingClosure] = useState(false);

  const loadAll = async () => {
    setLoading(true);
    setError("");
    try {
      const [settingsData, hoursData, closuresData] = await Promise.all([
        adminGetBookingSettings(accessToken),
        adminGetWorkingHours(accessToken),
        adminGetClosures(accessToken),
      ]);
      setSettings(settingsData);
      setWorkingHours(hoursData);
      setClosures(closuresData);
      setModeMessage(settingsData.pauseMessage || "");
      setResumeOn(settingsData.resumeOn || "");
    } catch (err: any) {
      setError(err.message || "Failed to load booking administration data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, [accessToken]);

  // Mode Change Handlers
  const handleInitiateModeChange = (mode: "open" | "paused" | "closed") => {
    setTargetMode(mode);
    if (mode === "open") {
      setModeMessage("");
      setResumeOn("");
    } else if (!modeMessage) {
      setModeMessage(
        mode === "paused"
          ? "Online booking is temporarily paused. For urgent scheduling, please call our clinic directly."
          : "Clinic is currently closed. For severe dental emergencies, please call our on-call line."
      );
    }
    setShowModeConfirm(true);
  };

  const handleConfirmModeChange = async () => {
    setIsUpdatingMode(true);
    setError("");
    setSuccessMsg("");
    try {
      const res = await adminUpdateBookingMode(
        {
          mode: targetMode,
          message: modeMessage.trim() || undefined,
          resumeOn: resumeOn || undefined,
        },
        accessToken
      );
      setSettings(res.settings);
      setShowModeConfirm(false);
      setSuccessMsg(
        `Booking status successfully updated to ${targetMode.toUpperCase()}. Public announcements updated.`
      );

      if (res.affectedBookings && res.affectedBookings.length > 0) {
        setAffectedBookings(res.affectedBookings);
        setShowAffectedModal(true);
        setTasksCreatedCount(null);
      }
    } catch (err: any) {
      setError(err.message || "Failed to update booking mode.");
    } finally {
      setIsUpdatingMode(false);
    }
  };

  // Bulk Reschedule Task Creation
  const handleCreateRescheduleTasks = async () => {
    if (affectedBookings.length === 0) return;
    setIsCreatingTasks(true);
    setError("");
    try {
      const res = await adminCreateRescheduleTasks(
        affectedBookings.map((b) => b.id),
        accessToken
      );
      setTasksCreatedCount(res.tasksCreated);
      setSuccessMsg(
        `Created ${res.tasksCreated} high-priority reception reschedule task(s). Existing bookings remain untouched.`
      );
    } catch (err: any) {
      setError(err.message || "Failed to create reschedule tasks.");
    } finally {
      setIsCreatingTasks(false);
    }
  };

  // Working Hours Handlers
  const handleToggleDayClosed = (dayOfWeek: number) => {
    setWorkingHours((prev) =>
      prev.map((h) => (h.dayOfWeek === dayOfWeek ? { ...h, isClosed: !h.isClosed } : h))
    );
  };

  const handleTimeChange = (
    dayOfWeek: number,
    field: "openTime" | "closeTime",
    val: string
  ) => {
    setWorkingHours((prev) =>
      prev.map((h) => (h.dayOfWeek === dayOfWeek ? { ...h, [field]: val } : h))
    );
  };

  const handleSaveWorkingHours = async () => {
    setHoursSaving(true);
    setError("");
    setSuccessMsg("");
    try {
      const updates = workingHours.map((h) => ({
        dayOfWeek: h.dayOfWeek,
        openTime: h.isClosed ? null : h.openTime || "08:00",
        closeTime: h.isClosed ? null : h.closeTime || "18:00",
        isClosed: h.isClosed,
      }));
      const updated = await adminUpdateWorkingHours(updates, accessToken);
      setWorkingHours(updated);
      setSuccessMsg("Clinic working hours successfully updated across footer, contact, and booking.");
    } catch (err: any) {
      setError(err.message || "Failed to save clinic operating hours.");
    } finally {
      setHoursSaving(false);
    }
  };

  // Closure CRUD Handlers
  const handleOpenAddClosure = () => {
    setEditingClosure(null);
    setClosureStart("");
    setClosureEnd("");
    setClosureReason("");
    setClosureMessage("");
    setClosureModalOpen(true);
  };

  const handleOpenEditClosure = (c: ClinicClosureItem) => {
    setEditingClosure(c);
    setClosureStart(c.startDate);
    setClosureEnd(c.endDate);
    setClosureReason(c.reason);
    setClosureMessage(c.message || "");
    setClosureModalOpen(true);
  };

  const handleSaveClosure = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!closureStart || !closureEnd || !closureReason.trim()) {
      setError("Please fill in start date, end date, and reason.");
      return;
    }
    setIsSavingClosure(true);
    setError("");
    setSuccessMsg("");
    try {
      if (editingClosure) {
        const updated = await adminUpdateClosure(
          editingClosure.id,
          {
            startDate: closureStart,
            endDate: closureEnd,
            reason: closureReason.trim(),
            message: closureMessage.trim() || undefined,
          },
          accessToken
        );
        setClosures((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
        setSuccessMsg("Closure successfully updated.");
      } else {
        const res = await adminCreateClosure(
          {
            startDate: closureStart,
            endDate: closureEnd,
            reason: closureReason.trim(),
            message: closureMessage.trim() || undefined,
          },
          accessToken
        );
        setClosures((prev) => [res.closure, ...prev]);
        setSuccessMsg("Closure created and added to booking calendar.");

        if (res.affectedBookings && res.affectedBookings.length > 0) {
          setAffectedBookings(res.affectedBookings);
          setShowAffectedModal(true);
          setTasksCreatedCount(null);
        }
      }
      setClosureModalOpen(false);
    } catch (err: any) {
      setError(err.message || "Failed to save closure.");
    } finally {
      setIsSavingClosure(false);
    }
  };

  const handleDeleteClosure = async (id: string) => {
    if (!confirm("Are you sure you want to remove this planned closure?")) return;
    try {
      await adminDeleteClosure(id, accessToken);
      setClosures((prev) => prev.filter((c) => c.id !== id));
      setSuccessMsg("Planned closure removed.");
    } catch (err: any) {
      setError(err.message || "Failed to delete closure.");
    }
  };

  const currentMode = settings?.bookingMode || "open";

  return (
    <div className="space-y-8 pb-16">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-semibold text-gray-900 dark:text-white">
            Booking &amp; Operating Hours
          </h1>
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">
            Single source of truth for public scheduling availability, emergency pause controls, and calendar closures.
          </p>
        </div>
        <Button
          onClick={loadAll}
          variant="secondary"
          size="sm"
          className="gap-2 self-start sm:self-auto"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Refresh</span>
        </Button>
      </div>

      {/* Global Alerts */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-950/40 p-4 text-xs sm:text-sm text-red-700 dark:text-red-300 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <XCircle className="h-4 w-4 shrink-0 text-red-500" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError("")} className="text-red-500 hover:text-red-700">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {successMsg && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/40 p-4 text-xs sm:text-sm text-emerald-800 dark:text-emerald-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 shrink-0 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg("")} className="text-emerald-600 hover:text-emerald-800">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Passed Resume Date Banner (Prominent Warning: No silent auto-reopen) */}
      {settings?.isResumePassed && currentMode !== "open" && (
        <div className="rounded-2xl border-2 border-amber-400 bg-amber-50 dark:bg-amber-950/50 p-5 shadow-sm space-y-3">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                Action Required: Scheduled Resume Date Has Passed ({settings.resumeOn})
              </h3>
              <p className="text-xs text-amber-800 dark:text-amber-300">
                The planned pause date has arrived. By safety policy, public booking is <strong>not automatically reopened</strong> without verification. Please confirm clinic staffing and click below to reopen online booking.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 pt-1 pl-8">
            <Button
              onClick={() => handleInitiateModeChange("open")}
              variant="primary"
              size="sm"
              className="bg-amber-700 hover:bg-amber-800 text-white font-medium"
            >
              <Play className="h-3.5 w-3.5 mr-1.5" />
              Reopen Online Booking Now
            </Button>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
       * SECTION 1: PROMINENT EMERGENCY BOOKING MODE CONTROL
       * ------------------------------------------------------------- */}
      <Card className="p-6 border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 dark:border-gray-800 pb-5">
          <div className="space-y-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Emergency Booking Mode
            </span>
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Public Scheduling Status:
              </h2>
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                  currentMode === "open"
                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300"
                    : currentMode === "paused"
                    ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300"
                    : "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 border border-red-300"
                }`}
              >
                <span
                  className={`h-2 w-2 rounded-full ${
                    currentMode === "open"
                      ? "bg-emerald-500 animate-pulse"
                      : currentMode === "paused"
                      ? "bg-amber-500"
                      : "bg-red-500"
                  }`}
                />
                {currentMode === "open"
                  ? "OPEN (Normal Public Booking)"
                  : currentMode === "paused"
                  ? "PAUSED (Public Disabled · Reception Active)"
                  : "CLOSED (Public Disabled · Override Required)"}
              </span>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2">
            {currentMode === "open" ? (
              <Button
                onClick={() => handleInitiateModeChange("paused")}
                variant="secondary"
                size="sm"
                className="border-amber-300 text-amber-800 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950 font-medium"
              >
                <Pause className="h-3.5 w-3.5 mr-1.5 text-amber-600" />
                One-Click Pause Booking
              </Button>
            ) : (
              <Button
                onClick={() => handleInitiateModeChange("open")}
                variant="primary"
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
              >
                <Play className="h-3.5 w-3.5 mr-1.5" />
                Reopen Online Booking
              </Button>
            )}

            <Button
              onClick={() => handleInitiateModeChange(currentMode === "closed" ? "open" : "closed")}
              variant="ghost"
              size="sm"
              className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
            >
              {currentMode === "closed" ? "Lift Closed State" : "Full Clinic Closure"}
            </Button>
          </div>
        </div>

        {/* Current Status Metadata & Banner synchronization info */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="bg-gray-50 dark:bg-gray-800/60 p-3.5 rounded-xl border border-gray-100 dark:border-gray-800 space-y-1">
            <span className="text-gray-500 dark:text-gray-400">Notice Message:</span>
            <p className="font-medium text-gray-800 dark:text-gray-200">
              {settings?.pauseMessage || "None (Default operational notice)"}
            </p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800/60 p-3.5 rounded-xl border border-gray-100 dark:border-gray-800 space-y-1">
            <span className="text-gray-500 dark:text-gray-400">Scheduled Resume Date:</span>
            <p className="font-medium text-gray-800 dark:text-gray-200">
              {settings?.resumeOn || "Indefinite / Manual Reopen"}
            </p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800/60 p-3.5 rounded-xl border border-gray-100 dark:border-gray-800 space-y-1">
            <span className="text-gray-500 dark:text-gray-400">Public Marquee Banner:</span>
            <p className="font-medium text-gray-800 dark:text-gray-200">
              {currentMode !== "open"
                ? "Auto-synced banner active on public site"
                : "Standard marquee announcements active"}
            </p>
          </div>
        </div>
      </Card>

      {/* -------------------------------------------------------------
       * SECTION 2: SINGLE SOURCE OF TRUTH OPERATING HOURS (B8)
       * ------------------------------------------------------------- */}
      <Card className="p-6 border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 dark:border-gray-800 pb-4">
          <div className="space-y-0.5">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">
              Weekly Clinic Operating Hours
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              The single source of truth for footer hours, contact hours, and the /book date-picker slot engine. Sunday is seeded closed.
            </p>
          </div>
          <Button
            onClick={handleSaveWorkingHours}
            disabled={hoursSaving}
            variant="primary"
            size="sm"
          >
            {hoursSaving ? "Saving Hours..." : "Save Working Hours"}
          </Button>
        </div>

        <div className="divide-y divide-gray-100 dark:divide-gray-800">
          {DAY_NAMES.map((name, idx) => {
            const h = workingHours.find((item) => item.dayOfWeek === idx) || {
              id: `temp-${idx}`,
              dayOfWeek: idx,
              dayName: name,
              openTime: "08:00",
              closeTime: "18:00",
              isClosed: idx === 6,
            };

            return (
              <div
                key={idx}
                className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs"
              >
                <div className="w-32 flex items-center gap-2">
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {name}
                  </span>
                  {idx === 6 && (
                    <span className="text-[10px] bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-gray-500">
                      Standard Closed
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-6 flex-wrap">
                  {/* Closed Checkbox */}
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={h.isClosed}
                      onChange={() => handleToggleDayClosed(idx)}
                      className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4"
                    />
                    <span className="text-gray-700 dark:text-gray-300 font-medium">
                      Closed on this day
                    </span>
                  </label>

                  {/* Open / Close Time Selectors */}
                  {!h.isClosed && (
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                      <span>Open:</span>
                      <input
                        type="time"
                        value={h.openTime || "08:00"}
                        onChange={(e) => handleTimeChange(idx, "openTime", e.target.value)}
                        className="rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-2 py-1 text-xs text-gray-900 dark:text-white"
                      />
                      <span className="px-1">to</span>
                      <span>Close:</span>
                      <input
                        type="time"
                        value={h.closeTime || "18:00"}
                        onChange={(e) => handleTimeChange(idx, "closeTime", e.target.value)}
                        className="rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-2 py-1 text-xs text-gray-900 dark:text-white"
                      />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* -------------------------------------------------------------
       * SECTION 3: PLANNED CALENDAR CLOSURES (B7)
       * ------------------------------------------------------------- */}
      <Card className="p-6 border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 dark:border-gray-800 pb-4">
          <div className="space-y-0.5">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">
              Planned Calendar Closures
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Manage holiday shutdowns, facility maintenance, and unexpected clinic closures. Dates within closures are disabled on the booking calendar with short reasons.
            </p>
          </div>
          <Button
            onClick={handleOpenAddClosure}
            variant="primary"
            size="sm"
            className="gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Planned Closure</span>
          </Button>
        </div>

        {closures.length === 0 ? (
          <div className="text-center py-10 bg-gray-50 dark:bg-gray-800/40 rounded-xl border border-dashed border-gray-200 dark:border-gray-700 space-y-2">
            <Calendar className="h-8 w-8 text-gray-400 mx-auto" />
            <p className="text-xs text-gray-500 dark:text-gray-400">
              No planned calendar closures scheduled.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 dark:bg-gray-800/60 text-gray-500 dark:text-gray-400 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-2.5 px-3">Date Range</th>
                  <th className="py-2.5 px-3">Reason</th>
                  <th className="py-2.5 px-3">Public Notice Message</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {closures.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30">
                    <td className="py-3 px-3 font-medium text-gray-900 dark:text-white whitespace-nowrap">
                      {c.startDate} {c.startDate !== c.endDate ? `to ${c.endDate}` : ""}
                    </td>
                    <td className="py-3 px-3 font-semibold text-gray-800 dark:text-gray-200">
                      {c.reason}
                    </td>
                    <td className="py-3 px-3 text-gray-600 dark:text-gray-400">
                      {c.message || "—"}
                    </td>
                    <td className="py-3 px-3 text-right space-x-2 whitespace-nowrap">
                      <button
                        onClick={() => handleOpenEditClosure(c)}
                        className="text-gray-600 hover:text-primary dark:text-gray-400 p-1 rounded"
                        title="Edit Closure"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteClosure(c.id)}
                        className="text-red-600 hover:text-red-800 dark:text-red-400 p-1 rounded"
                        title="Delete Closure"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* -------------------------------------------------------------
       * MODAL 1: MODE CHANGE CONFIRMATION
       * ------------------------------------------------------------- */}
      {showModeConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                Confirm Booking Mode Change: {targetMode.toUpperCase()}
              </h3>
              <button
                onClick={() => setShowModeConfirm(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs text-gray-600 dark:text-gray-400">
              {targetMode === "paused"
                ? "Pausing booking will immediately disable online submissions on /book. Receptionists can still schedule normally by phone."
                : targetMode === "closed"
                ? "Setting mode to CLOSED disables public bookings and requires receptionists to provide a recorded reason to override."
                : "Reopening will remove the auto pause banner and restore normal online scheduling for patients."}
            </p>

            {targetMode !== "open" && (
              <div className="space-y-3 pt-2">
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Public Notice Message
                  </label>
                  <textarea
                    rows={3}
                    value={modeMessage}
                    onChange={(e) => setModeMessage(e.target.value)}
                    placeholder="Enter message shown on /book and public marquee banner..."
                    className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 p-2.5 text-xs text-gray-900 dark:text-white outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Scheduled Resume Date (Optional)
                  </label>
                  <input
                    type="date"
                    value={resumeOn}
                    onChange={(e) => setResumeOn(e.target.value)}
                    className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 p-2.5 text-xs text-gray-900 dark:text-white outline-none focus:ring-1 focus:ring-primary"
                  />
                  <p className="text-[11px] text-gray-500 mt-1">
                    If this date passes, a notification banner will alert administrators to manually verify and reopen.
                  </p>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowModeConfirm(false)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleConfirmModeChange}
                disabled={isUpdatingMode}
              >
                {isUpdatingMode ? "Applying Change..." : `Confirm & Switch to ${targetMode.toUpperCase()}`}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
       * MODAL 2: AFFECTED BOOKINGS & RESCHEDULE TASKS BULK ACTION
       * ------------------------------------------------------------- */}
      {showAffectedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-2xl rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-6 shadow-xl space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                  Affected Bookings Discovered ({affectedBookings.length})
                </h3>
              </div>
              <button
                onClick={() => setShowAffectedModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs text-gray-600 dark:text-gray-400">
              The following existing bookings fall within this closure/pause period. In accordance with clinic safety rules, <strong>bookings are never moved or cancelled automatically</strong>.
            </p>

            <div className="flex-1 overflow-y-auto border border-gray-100 dark:border-gray-800 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 dark:bg-gray-800/60 text-gray-500 uppercase text-[10px]">
                  <tr>
                    <th className="p-2.5">Confirmation</th>
                    <th className="p-2.5">Date &amp; Time</th>
                    <th className="p-2.5">Patient Name</th>
                    <th className="p-2.5">Phone</th>
                    <th className="p-2.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {affectedBookings.map((b) => (
                    <tr key={b.id}>
                      <td className="p-2.5 font-mono text-[11px] font-semibold text-gray-800 dark:text-gray-200">
                        {b.confirmationId}
                      </td>
                      <td className="p-2.5 whitespace-nowrap">
                        {b.preferredDate} · {b.preferredTime}
                      </td>
                      <td className="p-2.5 font-medium">{b.patientFullName}</td>
                      <td className="p-2.5 text-gray-600 dark:text-gray-400">{b.patientPhone}</td>
                      <td className="p-2.5">
                        <span className="capitalize px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-[10px]">
                          {b.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
              <span className="text-xs text-gray-500">
                {tasksCreatedCount !== null
                  ? `Successfully created ${tasksCreatedCount} reception tasks.`
                  : "Create 1 high-priority reschedule task per booking for the front desk."}
              </span>

              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAffectedModal(false)}
                >
                  Dismiss
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleCreateRescheduleTasks}
                  disabled={isCreatingTasks || tasksCreatedCount !== null}
                  className="bg-amber-600 hover:bg-amber-700 text-white"
                >
                  {isCreatingTasks
                    ? "Creating Tasks..."
                    : tasksCreatedCount !== null
                    ? "Tasks Created ✓"
                    : "Create Reschedule Tasks"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
       * MODAL 3: ADD / EDIT PLANNED CLOSURE
       * ------------------------------------------------------------- */}
      {closureModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <form
            onSubmit={handleSaveClosure}
            className="w-full max-w-md rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-6 shadow-xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                {editingClosure ? "Edit Planned Closure" : "Add Planned Closure"}
              </h3>
              <button
                type="button"
                onClick={() => setClosureModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <TextField
                  id="closure-start"
                  label="Start Date"
                  type="date"
                  value={closureStart}
                  onChange={(e) => setClosureStart(e.target.value)}
                  required
                />
                <TextField
                  id="closure-end"
                  label="End Date"
                  type="date"
                  value={closureEnd}
                  onChange={(e) => setClosureEnd(e.target.value)}
                  required
                />
              </div>

              <TextField
                id="closure-reason"
                label="Closure Reason"
                placeholder="e.g. Public Holiday, Clinic Renovation"
                value={closureReason}
                onChange={(e) => setClosureReason(e.target.value)}
                required
              />

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Optional Patient Message
                </label>
                <textarea
                  rows={2}
                  value={closureMessage}
                  onChange={(e) => setClosureMessage(e.target.value)}
                  placeholder="e.g. Closed in observance of national holiday. Emergency line open."
                  className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 p-2.5 text-xs text-gray-900 dark:text-white outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setClosureModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={isSavingClosure}
              >
                {isSavingClosure ? "Saving..." : editingClosure ? "Update Closure" : "Create Closure"}
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
