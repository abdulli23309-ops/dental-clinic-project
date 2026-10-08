"use client";

import { useEffect, useState } from "react";
import {
  Calendar,
  CheckCircle,
  Clock,
  Edit,
  FileText,
  RefreshCw,
  Save,
  Stethoscope,
  User,
  X,
} from "lucide-react";

import {
  getDoctorSchedule,
  ReceptionBooking,
  updateDoctorBookingNotes,
} from "@/lib/api";
import { useAuth } from "@/components/providers/auth-provider";

export default function DoctorDashboardPage() {
  const { accessToken } = useAuth();

  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [schedule, setSchedule] = useState<ReceptionBooking[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Notes Modal
  const [selectedBooking, setSelectedBooking] = useState<ReceptionBooking | null>(null);
  const [notes, setNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const loadSchedule = async () => {
    setIsLoading(true);
    try {
      const data = await getDoctorSchedule(date, accessToken);
      setSchedule(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSchedule();
  }, [date, accessToken]);

  const handleSaveNotes = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBooking) return;

    setIsSaving(true);
    try {
      await updateDoctorBookingNotes(selectedBooking.id, notes, accessToken);
      setSelectedBooking(null);
      await loadSchedule();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to update clinical notes.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-semibold text-gray-900 dark:text-white">
            Clinical Schedule & Patient Visits
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            View assigned patient procedures, treatment status, and manage clinical visit notes.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-xs font-mono text-gray-900 dark:text-white shadow-xs"
          />

          <button
            onClick={loadSchedule}
            className="p-2 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 shadow-xs"
          >
            <RefreshCw className="h-4 w-4 text-gray-600 dark:text-gray-300" />
          </button>
        </div>
      </div>

      {/* Schedule Table */}
      <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden shadow-xs">
        {isLoading ? (
          <div className="p-12 text-center text-xs font-mono text-gray-500">
            Loading practitioner schedule...
          </div>
        ) : schedule.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <Stethoscope className="h-8 w-8 text-gray-400 mx-auto" />
            <p className="text-sm font-semibold text-gray-900 dark:text-white">
              No appointments on your schedule for {date}
            </p>
            <p className="text-xs text-gray-500">
              The front desk will assign appointments as patients check in.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800 text-gray-500 dark:text-gray-400 uppercase font-mono text-[10px]">
                <tr>
                  <th className="px-4 py-3">Time</th>
                  <th className="px-4 py-3">Patient</th>
                  <th className="px-4 py-3">Procedure</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Clinical Notes</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {schedule.map((b) => (
                  <tr key={b.id} className="hover:bg-gray-50/80 dark:hover:bg-gray-800/40">
                    <td className="px-4 py-3 font-mono font-semibold text-gray-900 dark:text-white">
                      {b.bookingTime}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-semibold text-gray-900 dark:text-white block">
                        {b.patientName || "Patient"}
                      </span>
                      {b.patientPhone && (
                        <span className="text-[11px] text-gray-400">{b.patientPhone}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                      {b.serviceName || "Clinical Examination"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`
                          px-2 py-0.5 rounded-full text-[10px] font-mono uppercase font-semibold
                          ${
                            b.status === "in_progress"
                              ? "bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300"
                              : b.status === "completed"
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                              : "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                          }
                        `}
                      >
                        {b.status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400 max-w-xs truncate">
                      {b.notes || <span className="text-gray-400 italic">No notes entered</span>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => {
                          setSelectedBooking(b);
                          setNotes(b.notes || "");
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-800 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 shadow-xs"
                      >
                        <Edit className="h-3.5 w-3.5" />
                        <span>Clinical Notes</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Clinical Notes Modal */}
      {selectedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
              <div>
                <h2 className="text-base font-display font-semibold text-gray-900 dark:text-white">
                  Patient Visit Notes
                </h2>
                <p className="text-xs text-gray-500">
                  {selectedBooking.patientName} · {selectedBooking.bookingDate} at {selectedBooking.bookingTime}
                </p>
              </div>
              <button onClick={() => setSelectedBooking(null)} className="p-1 text-gray-400">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveNotes} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-medium text-gray-700 dark:text-gray-300">
                  Clinical Observations & Treatment Notes *
                </label>
                <textarea
                  rows={5}
                  required
                  placeholder="Record treatment performed, diagnosis, materials used, next recommended recall..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 font-sans"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedBooking(null)}
                  className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 text-white font-semibold hover:bg-teal-700"
                >
                  <Save className="h-3.5 w-3.5" />
                  <span>{isSaving ? "Saving..." : "Save Clinical Notes"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
