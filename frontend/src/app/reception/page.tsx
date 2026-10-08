"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  Calendar,
  CheckCircle,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileCheck,
  Inbox,
  ListTodo,
  Phone,
  PhoneCall,
  Plus,
  RefreshCw,
  Search,
  User,
  UserCheck,
  Users,
  UserX,
  XCircle,
  Zap,
} from "lucide-react";

import {
  getReceptionDashboard,
  getReceptionHuddle,
  ReceptionDashboardStats,
  ReceptionDailyHuddle,
  updateReceptionBookingStatus,
  updateReceptionBookingConfirmation,
} from "@/lib/api";
import { useAuth } from "@/components/providers/auth-provider";

export default function ReceptionDashboardPage() {
  const router = useRouter();
  const { accessToken } = useAuth();

  const [stats, setStats] = useState<ReceptionDashboardStats | null>(null);
  const [huddle, setHuddle] = useState<ReceptionDailyHuddle | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const loadData = async (showLoading = true) => {
    if (showLoading) setIsLoading(true);
    else setIsRefreshing(true);
    setError(null);

    try {
      const [statsData, huddleData] = await Promise.all([
        getReceptionDashboard(accessToken),
        getReceptionHuddle(accessToken),
      ]);
      setStats(statsData);
      setHuddle(huddleData);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard metrics.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [accessToken]);

  const handleStatusChange = async (bookingId: string, newStatus: string) => {
    setActionLoadingId(bookingId);
    try {
      await updateReceptionBookingStatus(bookingId, newStatus, undefined, accessToken);
      await loadData(false);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to update appointment status.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleConfirm = async (bookingId: string) => {
    setActionLoadingId(bookingId);
    try {
      await updateReceptionBookingConfirmation(bookingId, "confirmed", accessToken);
      await loadData(false);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to confirm appointment.");
    } finally {
      setActionLoadingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
        <p className="text-xs font-mono uppercase tracking-wider text-gray-500">
          Loading Front-Desk Command Center...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Top Header & Operational Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-semibold text-gray-900 dark:text-white">
            Front-Office Command Center
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Real-time practice schedule, patient arrivals, waiting room flow, and urgent triage.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => loadData(false)}
            disabled={isRefreshing}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors shadow-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
            <span>{isRefreshing ? "Updating..." : "Refresh Queue"}</span>
          </button>

          <Link
            href="/reception/schedule"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-medium hover:bg-emerald-700 transition-colors shadow-xs"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>New Appointment</span>
          </Link>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-300 text-sm flex items-center gap-3">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* 1. Today at a Glance (Live Metric Cards) */}
      <section className="space-y-3">
        <h2 className="text-xs font-mono uppercase tracking-wider text-gray-500 dark:text-gray-400">
          1. Today at a Glance
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          <div className="p-4 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-xs">
            <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400">Today Total</p>
            <p className="text-2xl font-display font-semibold text-gray-900 dark:text-white mt-1">
              {stats?.todayAppointments ?? 0}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/40 shadow-xs">
            <p className="text-[11px] font-medium text-emerald-800 dark:text-emerald-300">Confirmed</p>
            <p className="text-2xl font-display font-semibold text-emerald-700 dark:text-emerald-400 mt-1">
              {stats?.confirmed ?? 0}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 shadow-xs">
            <p className="text-[11px] font-medium text-amber-800 dark:text-amber-300">Unconfirmed</p>
            <p className="text-2xl font-display font-semibold text-amber-600 dark:text-amber-400 mt-1">
              {stats?.unconfirmed ?? 0}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-900/40 shadow-xs">
            <p className="text-[11px] font-medium text-blue-800 dark:text-blue-300">Checked In</p>
            <p className="text-2xl font-display font-semibold text-blue-600 dark:text-blue-400 mt-1">
              {stats?.checkedIn ?? 0}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200/60 dark:border-indigo-900/40 shadow-xs">
            <p className="text-[11px] font-medium text-indigo-800 dark:text-indigo-300">Waiting</p>
            <p className="text-2xl font-display font-semibold text-indigo-600 dark:text-indigo-400 mt-1">
              {stats?.waiting ?? 0}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-teal-50/50 dark:bg-teal-950/20 border border-teal-200/60 dark:border-teal-900/40 shadow-xs">
            <p className="text-[11px] font-medium text-teal-800 dark:text-teal-300">With Doctor</p>
            <p className="text-2xl font-display font-semibold text-teal-600 dark:text-teal-400 mt-1">
              {stats?.inProgress ?? 0}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-800 shadow-xs">
            <p className="text-[11px] font-medium text-gray-600 dark:text-gray-400">Completed</p>
            <p className="text-2xl font-display font-semibold text-gray-700 dark:text-gray-300 mt-1">
              {stats?.completed ?? 0}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-red-50/50 dark:bg-red-950/20 border border-red-200/60 dark:border-red-900/40 shadow-xs">
            <p className="text-[11px] font-medium text-red-800 dark:text-red-300">No-Show / Can</p>
            <p className="text-2xl font-display font-semibold text-red-600 dark:text-red-400 mt-1">
              {(stats?.noShow ?? 0) + (stats?.cancelled ?? 0)}
            </p>
          </div>
        </div>
      </section>

      {/* 2. Today's Patient Flow Queue */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-xs font-mono uppercase tracking-wider text-gray-500 dark:text-gray-400">
              2. Today's Patient Flow
            </h2>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-semibold">
              Live Queue
            </span>
          </div>
          <Link
            href="/reception/check-in"
            className="text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:underline inline-flex items-center gap-1"
          >
            <span>Open Waiting Room View</span>
            <ExternalLink className="h-3 w-3" />
          </Link>
        </div>

        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden shadow-xs">
          {(!stats?.todayFlow || stats.todayFlow.length === 0) ? (
            <div className="p-8 text-center space-y-2">
              <Calendar className="h-8 w-8 text-gray-400 mx-auto" />
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                No appointments scheduled for today yet.
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Book a new appointment or review incoming web requests.
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
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Arrival</th>
                    <th className="px-4 py-3 text-right">Quick Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {stats.todayFlow.map((item) => (
                    <tr
                      key={item.id}
                      className="hover:bg-gray-50/80 dark:hover:bg-gray-800/40 transition-colors"
                    >
                      <td className="px-4 py-3 font-mono font-semibold text-gray-900 dark:text-white whitespace-nowrap">
                        {item.appointmentTime}
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/reception/patients/${item.patientId}`}
                          className="font-medium text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1.5"
                        >
                          <User className="h-3 w-3" />
                          <span>{item.patientName}</span>
                        </Link>
                        {item.patientPhone && (
                          <span className="text-[11px] text-gray-400 block mt-0.5">
                            {item.patientPhone}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                        {item.providerName || "Unassigned"}
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                        {item.serviceName || "General Consultation"}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={`
                            px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold uppercase
                            ${
                              item.status === "scheduled"
                                ? "bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300"
                                : item.status === "arrived"
                                ? "bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300"
                                : item.status === "in_progress"
                                ? "bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-300"
                                : item.status === "completed"
                                ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300"
                                : item.status === "cancelled"
                                ? "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
                                : "bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300"
                            }
                          `}
                        >
                          {item.status.replace("_", " ")}
                        </span>
                        {item.confirmationStatus === "unconfirmed" && (
                          <span className="ml-1 px-1.5 py-0.2 rounded text-[9px] font-mono bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                            Unconfirmed
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                        {item.arrivalTime ? (
                          <span className="font-mono text-gray-900 dark:text-gray-100">
                            {item.arrivalTime}
                            {item.waitingMinutes !== null && item.waitingMinutes !== undefined && (
                              <span className="text-[10px] text-amber-600 dark:text-amber-400 ml-1">
                                ({item.waitingMinutes}m wait)
                              </span>
                            )}
                          </span>
                        ) : (
                          <span className="text-gray-400 italic">Not arrived</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          {item.confirmationStatus === "unconfirmed" && (
                            <button
                              onClick={() => handleConfirm(item.id)}
                              disabled={actionLoadingId === item.id}
                              title="Mark Confirmed"
                              className="px-2 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 text-[11px] font-medium border border-emerald-200 dark:border-emerald-800"
                            >
                              Confirm
                            </button>
                          )}

                          {item.status === "scheduled" && (
                            <button
                              onClick={() => handleStatusChange(item.id, "arrived")}
                              disabled={actionLoadingId === item.id}
                              className="px-2.5 py-1 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-[11px] font-medium shadow-2xs"
                            >
                              Check In
                            </button>
                          )}

                          {item.status === "arrived" && (
                            <button
                              onClick={() => handleStatusChange(item.id, "in_progress")}
                              disabled={actionLoadingId === item.id}
                              className="px-2.5 py-1 rounded-lg bg-teal-600 text-white hover:bg-teal-700 text-[11px] font-medium shadow-2xs"
                            >
                              With Doctor
                            </button>
                          )}

                          {item.status === "in_progress" && (
                            <button
                              onClick={() => handleStatusChange(item.id, "completed")}
                              disabled={actionLoadingId === item.id}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 text-[11px] font-medium shadow-2xs"
                            >
                              Complete
                            </button>
                          )}

                          {item.status === "scheduled" && (
                            <button
                              onClick={() => handleStatusChange(item.id, "no_show")}
                              disabled={actionLoadingId === item.id}
                              className="px-2 py-1 rounded-lg text-gray-500 hover:text-red-600 text-[11px]"
                            >
                              No-Show
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
      </section>

      {/* 3 & 4. Needs Attention & Quick Actions Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 3. Needs Attention */}
        <section className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-mono uppercase tracking-wider text-gray-500 dark:text-gray-400">
              3. Needs Attention
            </h2>
            <span className="text-[11px] font-mono text-gray-400">Action Required</span>
          </div>

          <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 divide-y divide-gray-100 dark:divide-gray-800">
            {(!stats?.needsAttention || stats.needsAttention.length === 0) ? (
              <div className="py-6 text-center text-xs text-gray-500 dark:text-gray-400 flex items-center justify-center gap-2">
                <CheckCircle className="h-4 w-4 text-emerald-500" />
                <span>All appointments confirmed, tasks up to date, and queues clear.</span>
              </div>
            ) : (
              stats.needsAttention.map((item, idx) => (
                <div key={idx} className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div
                      className={`
                        p-2 rounded-xl mt-0.5 shrink-0
                        ${
                          item.priority === "urgent"
                            ? "bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400"
                            : item.priority === "high"
                            ? "bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400"
                            : "bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400"
                        }
                      `}
                    >
                      <AlertTriangle className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-900 dark:text-white">
                        {item.title}
                      </p>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                        {item.description}
                      </p>
                    </div>
                  </div>

                  <Link
                    href={item.link}
                    className="px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-800 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors whitespace-nowrap shadow-xs"
                  >
                    Resolve
                  </Link>
                </div>
              ))
            )}
          </div>
        </section>

        {/* 4. Quick Actions */}
        <section className="space-y-3">
          <h2 className="text-xs font-mono uppercase tracking-wider text-gray-500 dark:text-gray-400">
            4. Quick Actions
          </h2>

          <div className="grid grid-cols-2 gap-3">
            <Link
              href="/reception/schedule"
              className="p-3.5 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 hover:border-emerald-500 dark:hover:border-emerald-500/50 hover:bg-emerald-50/20 dark:hover:bg-emerald-950/20 transition-all flex flex-col items-start gap-2 shadow-xs group"
            >
              <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 group-hover:scale-105 transition-transform">
                <Calendar className="h-4 w-4" />
              </div>
              <span className="text-xs font-semibold text-gray-900 dark:text-white">New Booking</span>
            </Link>

            <Link
              href="/reception/patients"
              className="p-3.5 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 hover:border-emerald-500 dark:hover:border-emerald-500/50 hover:bg-emerald-50/20 dark:hover:bg-emerald-950/20 transition-all flex flex-col items-start gap-2 shadow-xs group"
            >
              <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400 group-hover:scale-105 transition-transform">
                <Users className="h-4 w-4" />
              </div>
              <span className="text-xs font-semibold text-gray-900 dark:text-white">New Patient</span>
            </Link>

            <Link
              href="/reception/check-in"
              className="p-3.5 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 hover:border-emerald-500 dark:hover:border-emerald-500/50 hover:bg-emerald-50/20 dark:hover:bg-emerald-950/20 transition-all flex flex-col items-start gap-2 shadow-xs group"
            >
              <div className="p-2 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400 group-hover:scale-105 transition-transform">
                <UserCheck className="h-4 w-4" />
              </div>
              <span className="text-xs font-semibold text-gray-900 dark:text-white">Check-In Desk</span>
            </Link>

            <Link
              href="/reception/appointments/requests"
              className="p-3.5 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 hover:border-emerald-500 dark:hover:border-emerald-500/50 hover:bg-emerald-50/20 dark:hover:bg-emerald-950/20 transition-all flex flex-col items-start gap-2 shadow-xs group"
            >
              <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400 group-hover:scale-105 transition-transform">
                <Inbox className="h-4 w-4" />
              </div>
              <span className="text-xs font-semibold text-gray-900 dark:text-white">Web Requests</span>
            </Link>

            <Link
              href="/reception/tasks"
              className="p-3.5 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 hover:border-emerald-500 dark:hover:border-emerald-500/50 hover:bg-emerald-50/20 dark:hover:bg-emerald-950/20 transition-all flex flex-col items-start gap-2 shadow-xs group"
            >
              <div className="p-2 rounded-xl bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-400 group-hover:scale-105 transition-transform">
                <ListTodo className="h-4 w-4" />
              </div>
              <span className="text-xs font-semibold text-gray-900 dark:text-white">Create Task</span>
            </Link>

            <Link
              href="/reception/patients"
              className="p-3.5 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 hover:border-emerald-500 dark:hover:border-emerald-500/50 hover:bg-emerald-50/20 dark:hover:bg-emerald-950/20 transition-all flex flex-col items-start gap-2 shadow-xs group"
            >
              <div className="p-2 rounded-xl bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-400 group-hover:scale-105 transition-transform">
                <Search className="h-4 w-4" />
              </div>
              <span className="text-xs font-semibold text-gray-900 dark:text-white">Search Patient</span>
            </Link>
          </div>
        </section>
      </div>

      {/* 5. Daily Huddle Summary */}
      <section className="space-y-3">
        <h2 className="text-xs font-mono uppercase tracking-wider text-gray-500 dark:text-gray-400">
          5. Daily Operational Huddle
        </h2>

        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 space-y-4 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-800 gap-2">
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                Practice Morning Briefing
              </p>
              <p className="text-xs text-gray-500">
                First appointment: <strong>{huddle?.firstAppointmentTime || "None scheduled"}</strong> · Total Bookings: <strong>{huddle?.totalAppointments || 0}</strong>
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs font-mono">
              <span className="text-amber-600 dark:text-amber-400">
                {huddle?.unconfirmedCount || 0} unconfirmed
              </span>
              <span className="text-blue-600 dark:text-blue-400">
                {huddle?.requestsCount || 0} intake requests
              </span>
            </div>
          </div>

          {/* Provider Roster for the Day */}
          <div>
            <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Provider Schedules Today
            </p>
            {(!huddle?.providerSchedule || huddle.providerSchedule.length === 0) ? (
              <p className="text-xs text-gray-400 italic">No provider appointments booked today.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {huddle.providerSchedule.map((p) => (
                  <div
                    key={p.providerId}
                    className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 flex items-center justify-between"
                  >
                    <div>
                      <p className="text-xs font-semibold text-gray-900 dark:text-white">
                        {p.providerName}
                      </p>
                      <p className="text-[10px] text-gray-500 font-mono mt-0.5">
                        {p.firstSlot ? `${p.firstSlot} - ${p.lastSlot}` : "Open schedule"}
                      </p>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-xs font-bold font-mono">
                      {p.appointmentsCount}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Action Items List */}
          {huddle?.actionItems && huddle.actionItems.length > 0 && (
            <div className="pt-2">
              <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Huddle Action Items
              </p>
              <ul className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
                {huddle.actionItems.map((item, idx) => (
                  <li key={idx} className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
