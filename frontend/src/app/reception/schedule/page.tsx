"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Calendar as CalendarIcon,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Filter,
  MoreHorizontal,
  Plus,
  Search,
  User,
  UserCheck,
  X,
  XCircle,
} from "lucide-react";

import {
  createReceptionBooking,
  getReceptionBookings,
  ReceptionBooking,
  rescheduleReceptionBooking,
  searchReceptionPatients,
  updateReceptionBookingConfirmation,
  updateReceptionBookingStatus,
} from "@/lib/api";
import { useAuth } from "@/components/providers/auth-provider";

export default function ReceptionSchedulePage() {
  const { accessToken } = useAuth();

  const [selectedDate, setSelectedDate] = useState(() => {
    return new Date().toISOString().split("T")[0];
  });
  const [viewMode, setViewMode] = useState<"day" | "list">("day");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const [bookings, setBookings] = useState<ReceptionBooking[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // New Booking Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [patientSearch, setPatientSearch] = useState("");
  const [patientResults, setPatientResults] = useState<Array<{ id: string; fullName: string; phone: string }>>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string>("");
  const [newBookingTime, setNewBookingTime] = useState("09:00");
  const [newBookingDate, setNewBookingDate] = useState(selectedDate);
  const [newBookingNotes, setNewBookingNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reschedule Modal State
  const [rescheduleBooking, setRescheduleBooking] = useState<ReceptionBooking | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleTime, setRescheduleTime] = useState("10:00");

  const loadBookings = async () => {
    setIsLoading(true);
    try {
      const data = await getReceptionBookings(
        {
          date: selectedDate,
          status: statusFilter || undefined,
          search: searchQuery || undefined,
        },
        accessToken
      );
      setBookings(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadBookings();
  }, [selectedDate, statusFilter, accessToken]);

  const handleDateChange = (daysOffset: number) => {
    const current = new Date(selectedDate);
    current.setDate(current.getDate() + daysOffset);
    setSelectedDate(current.toISOString().split("T")[0]);
  };

  const handlePatientSearch = async (query: string) => {
    setPatientSearch(query);
    if (query.trim().length < 2) {
      setPatientResults([]);
      return;
    }
    try {
      const res = await searchReceptionPatients({ search: query, limit: 5 }, accessToken);
      setPatientResults(res.items.map((p) => ({ id: p.id, fullName: p.fullName, phone: p.phone })));
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatientId) {
      alert("Please select a patient.");
      return;
    }

    setIsSubmitting(true);
    try {
      await createReceptionBooking(
        {
          patientId: selectedPatientId,
          bookingDate: newBookingDate,
          bookingTime: newBookingTime,
          durationMinutes: 30,
          notes: newBookingNotes,
        },
        accessToken
      );
      setIsModalOpen(false);
      setSelectedPatientId("");
      setPatientSearch("");
      setNewBookingNotes("");
      await loadBookings();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to create booking.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReschedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rescheduleBooking) return;

    setIsSubmitting(true);
    try {
      await rescheduleReceptionBooking(
        rescheduleBooking.id,
        {
          bookingDate: rescheduleDate,
          bookingTime: rescheduleTime,
        },
        accessToken
      );
      setRescheduleBooking(null);
      await loadBookings();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to reschedule booking.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusUpdate = async (bookingId: string, status: string) => {
    try {
      await updateReceptionBookingStatus(bookingId, status, undefined, accessToken);
      await loadBookings();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to update status.");
    }
  };

  const handleConfirmBooking = async (bookingId: string) => {
    try {
      await updateReceptionBookingConfirmation(bookingId, "confirmed", accessToken);
      await loadBookings();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to confirm.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-semibold text-gray-900 dark:text-white">
            Operational Schedule
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Daily practice schedule, provider assignments, and chair availability.
          </p>
        </div>

        <button
          onClick={() => {
            setNewBookingDate(selectedDate);
            setIsModalOpen(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition-colors shadow-xs"
        >
          <Plus className="h-4 w-4" />
          <span>New Appointment</span>
        </button>
      </div>

      {/* Date Navigation Bar & Filter Controls */}
      <div className="p-4 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-xs flex flex-wrap items-center justify-between gap-4">
        {/* Date Selector */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleDateChange(-1)}
            className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 text-xs font-medium font-mono text-gray-900 dark:text-white"
          />

          <button
            onClick={() => handleDateChange(1)}
            className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300"
          >
            <ChevronRight className="h-4 w-4" />
          </button>

          <button
            onClick={() => setSelectedDate(new Date().toISOString().split("T")[0])}
            className="px-2.5 py-1 rounded-lg border border-gray-200 dark:border-gray-800 text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            Today
          </button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter className="h-3.5 w-3.5 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 text-xs text-gray-700 dark:text-gray-300"
            >
              <option value="">All Statuses</option>
              <option value="scheduled">Scheduled</option>
              <option value="arrived">Arrived</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
              <option value="no_show">No Show</option>
            </select>
          </div>

          <div className="relative">
            <Search className="h-3.5 w-3.5 text-gray-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Search patient..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && loadBookings()}
              className="pl-8 pr-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 text-xs text-gray-900 dark:text-white w-44 focus:w-56 transition-all"
            />
          </div>
        </div>
      </div>

      {/* Schedule Table / Grid */}
      <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden shadow-xs">
        {isLoading ? (
          <div className="p-12 text-center text-xs text-gray-500 font-mono">
            Loading appointments for {selectedDate}...
          </div>
        ) : bookings.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <CalendarIcon className="h-8 w-8 text-gray-400 mx-auto" />
            <p className="text-sm font-semibold text-gray-900 dark:text-white">
              No appointments on {selectedDate}
            </p>
            <p className="text-xs text-gray-500">
              Click &quot;New Appointment&quot; above to schedule a patient slot.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800 text-gray-500 dark:text-gray-400 uppercase font-mono text-[10px]">
                <tr>
                  <th className="px-4 py-3">Time</th>
                  <th className="px-4 py-3">Patient</th>
                  <th className="px-4 py-3">Provider</th>
                  <th className="px-4 py-3">Service</th>
                  <th className="px-4 py-3">Duration</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Confirmation</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {bookings.map((b) => (
                  <tr key={b.id} className="hover:bg-gray-50/80 dark:hover:bg-gray-800/40">
                    <td className="px-4 py-3 font-mono font-semibold text-gray-900 dark:text-white">
                      {b.bookingTime}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/reception/patients/${b.patientId}`}
                        className="font-medium text-emerald-600 dark:text-emerald-400 hover:underline"
                      >
                        {b.patientName || "Patient"}
                      </Link>
                      {b.patientPhone && (
                        <span className="text-[11px] text-gray-400 block">{b.patientPhone}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                      {b.providerName || "Assigned Provider"}
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                      {b.serviceName || "Dental Visit"}
                    </td>
                    <td className="px-4 py-3 text-gray-500 font-mono">
                      {b.durationMinutes} min
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`
                          px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold uppercase
                          ${
                            b.status === "scheduled"
                              ? "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                              : b.status === "arrived"
                              ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                              : b.status === "in_progress"
                              ? "bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300"
                              : b.status === "completed"
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                              : "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300"
                          }
                        `}
                      >
                        {b.status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`
                          px-2 py-0.5 rounded-full text-[10px] font-mono
                          ${
                            b.confirmationStatus === "confirmed"
                              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 font-medium"
                              : "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                          }
                        `}
                      >
                        {b.confirmationStatus}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-1">
                        {b.confirmationStatus === "unconfirmed" && (
                          <button
                            onClick={() => handleConfirmBooking(b.id)}
                            className="px-2 py-1 rounded bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-[11px] font-medium hover:bg-emerald-100"
                          >
                            Confirm
                          </button>
                        )}

                        {b.status === "scheduled" && (
                          <button
                            onClick={() => handleStatusUpdate(b.id, "arrived")}
                            className="px-2 py-1 rounded bg-blue-600 text-white text-[11px] font-medium hover:bg-blue-700"
                          >
                            Check In
                          </button>
                        )}

                        <button
                          onClick={() => {
                            setRescheduleBooking(b);
                            setRescheduleDate(b.bookingDate);
                            setRescheduleTime(b.bookingTime);
                          }}
                          className="px-2 py-1 rounded border border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 text-[11px] hover:bg-gray-100 dark:hover:bg-gray-800"
                        >
                          Reschedule
                        </button>

                        {b.status !== "cancelled" && b.status !== "completed" && (
                          <button
                            onClick={() => handleStatusUpdate(b.id, "cancelled")}
                            className="px-2 py-1 rounded text-red-600 dark:text-red-400 text-[11px] hover:bg-red-50 dark:hover:bg-red-950/40"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* New Booking Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
              <h2 className="text-base font-display font-semibold text-gray-900 dark:text-white">
                Create Operational Booking
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateBooking} className="space-y-4">
              {/* Patient Search */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                  Select Patient *
                </label>
                <input
                  type="text"
                  placeholder="Search patient by name or phone..."
                  value={patientSearch}
                  onChange={(e) => handlePatientSearch(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 text-xs text-gray-900 dark:text-white"
                />
                {patientResults.length > 0 && (
                  <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 shadow-md p-1 max-h-36 overflow-y-auto space-y-1">
                    {patientResults.map((p) => (
                      <button
                        type="button"
                        key={p.id}
                        onClick={() => {
                          setSelectedPatientId(p.id);
                          setPatientSearch(`${p.fullName} (${p.phone})`);
                          setPatientResults([]);
                        }}
                        className={`w-full text-left px-3 py-2 rounded-lg text-xs flex justify-between hover:bg-emerald-50 dark:hover:bg-emerald-950/40 ${
                          selectedPatientId === p.id ? "bg-emerald-100 dark:bg-emerald-950 font-bold" : ""
                        }`}
                      >
                        <span>{p.fullName}</span>
                        <span className="font-mono text-gray-400">{p.phone}</span>
                      </button>
                    ))}
                  </div>
                )}
                {selectedPatientId && (
                  <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                    ✓ Patient selected
                  </p>
                )}
              </div>

              {/* Date & Time */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                    Booking Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={newBookingDate}
                    onChange={(e) => setNewBookingDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 text-xs font-mono text-gray-900 dark:text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                    Booking Time *
                  </label>
                  <input
                    type="time"
                    required
                    value={newBookingTime}
                    onChange={(e) => setNewBookingTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 text-xs font-mono text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                  Notes / Reason for Visit
                </label>
                <textarea
                  rows={2}
                  value={newBookingNotes}
                  onChange={(e) => setNewBookingNotes(e.target.value)}
                  placeholder="e.g. Routine cleaning & bitewing x-rays"
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 text-xs text-gray-900 dark:text-white"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-800 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700"
                >
                  {isSubmitting ? "Creating..." : "Save Appointment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reschedule Modal */}
      {rescheduleBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
              <h2 className="text-base font-display font-semibold text-gray-900 dark:text-white">
                Reschedule Booking
              </h2>
              <button
                onClick={() => setRescheduleBooking(null)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleReschedule} className="space-y-4">
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Patient: <strong>{rescheduleBooking.patientName}</strong>
              </p>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                    New Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={rescheduleDate}
                    onChange={(e) => setRescheduleDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 text-xs font-mono text-gray-900 dark:text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                    New Time *
                  </label>
                  <input
                    type="time"
                    required
                    value={rescheduleTime}
                    onChange={(e) => setRescheduleTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 text-xs font-mono text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setRescheduleBooking(null)}
                  className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-800 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700"
                >
                  {isSubmitting ? "Updating..." : "Confirm Reschedule"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
