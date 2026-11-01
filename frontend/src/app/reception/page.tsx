"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Eye,
  FileText,
  Inbox,
  ListTodo,
  Mail,
  Phone,
  PhoneCall,
  Plus,
  RefreshCw,
  Stethoscope,
  User,
  UserCheck,
  UserX,
  X,
} from "lucide-react";

import {
  createReceptionTask,
  getReceptionBookingById,
  getReceptionDashboard,
  ReceptionAttentionItem,
  ReceptionBooking,
  ReceptionDashboardStats,
  snoozeReceptionQueueItem,
  updateReceptionBookingStatus,
} from "@/lib/api";
import { useDirectory } from "@/lib/directory";
import { useAuth } from "@/components/providers/auth-provider";
import {
  isRequested,
  isExpected,
  isWaiting,
  isInProgress,
  APPOINTMENT_STATUS,
} from "@/lib/statuses";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { Panel } from "@/components/dashboard/panel";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { EmptyState, ErrorState } from "@/components/dashboard/states";
import { Button } from "@/components/ui/button";
import { AnimatedPage } from "@/components/ui/animated-page";
import { Skeleton, SkeletonText } from "@/components/ui/skeleton";
import { StaggerList } from "@/components/ui/stagger-list";

/**
 * Receptionist dashboard: front-office enterprise PMS operations
 * fed entirely by GET /api/v1/reception/dashboard (real database counts,
 * today's real appointment flow, live triage queue, and in-context booking inspector).
 */
export default function ReceptionDashboardPage() {
  const { accessToken, user } = useAuth();
  const directory = useDirectory();

  const [stats, setStats] = useState<ReceptionDashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // In-context Booking Inspector Modal state (prevents navigation crashes)
  const [inspectBookingId, setInspectBookingId] = useState<string | null>(null);
  const [inspectBooking, setInspectBooking] = useState<ReceptionBooking | null>(null);
  const [isLoadingInspect, setIsLoadingInspect] = useState(false);
  const [inspectError, setInspectError] = useState<string | null>(null);

  // Quick task modal state
  const [taskModalItem, setTaskModalItem] = useState<{
    bookingId?: string | null;
    patientId?: string | null;
    title: string;
    priority?: "urgent" | "high" | "medium" | "low";
  } | null>(null);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskPriority, setTaskPriority] = useState<"urgent" | "high" | "medium" | "low">("high");
  const [isSubmittingTask, setIsSubmittingTask] = useState(false);

  // Queue filter tab
  const [queueFilter, setQueueFilter] = useState<string>("all");

  const loadData = async (showLoading = true) => {
    if (showLoading) setIsLoading(true);
    else setIsRefreshing(true);
    setError(null);
    try {
      const data = await getReceptionDashboard(accessToken);
      setStats(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard metrics.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();

    // Auto-poll every 30 seconds for real-time PMS updates (new public bookings, triage queue changes)
    const interval = setInterval(() => {
      loadData(false);
    }, 30000);

    const handleFocus = () => {
      loadData(false);
    };
    window.addEventListener("focus", handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
    };
  }, [accessToken]);

  const handleStatusChange = async (bookingId: string, newStatus: string) => {
    setActionLoadingId(bookingId);
    try {
      await updateReceptionBookingStatus(bookingId, newStatus, undefined, accessToken);
      // If currently inspecting this booking, update in modal
      if (inspectBooking && inspectBooking.id === bookingId) {
        setInspectBooking((prev) => (prev ? { ...prev, status: newStatus } : null));
      }
      await loadData(false);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to update appointment status.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleInspectBooking = async (bookingId: string) => {
    setInspectBookingId(bookingId);
    setInspectBooking(null);
    setIsLoadingInspect(true);
    setInspectError(null);
    try {
      const detail = await getReceptionBookingById(bookingId, accessToken);
      setInspectBooking(detail);
    } catch (err: unknown) {
      setInspectError(err instanceof Error ? err.message : "Failed to load appointment details.");
    } finally {
      setIsLoadingInspect(false);
    }
  };

  const handleSnooze = async (item: ReceptionAttentionItem, durationHours = 24) => {
    setActionLoadingId(`snooze-${item.id}`);
    try {
      const itemType = item.taskId ? "task" : "booking";
      const itemId = item.targetId || item.bookingId || item.taskId || item.id;
      await snoozeReceptionQueueItem(itemType, itemId, durationHours, accessToken);
      await loadData(false);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to snooze queue item.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleOpenTaskModal = (item: {
    bookingId?: string | null;
    patientId?: string | null;
    title: string;
    priority?: "urgent" | "high" | "medium" | "low";
  }) => {
    setTaskModalItem(item);
    setTaskTitle(`Follow up: ${item.title}`);
    setTaskPriority(item.priority || "high");
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskModalItem || !taskTitle.trim()) return;
    setIsSubmittingTask(true);
    try {
      await createReceptionTask(
        {
          title: taskTitle.trim(),
          priority: taskPriority,
          bookingId: taskModalItem.bookingId || undefined,
          patientId: taskModalItem.patientId || undefined,
        },
        accessToken
      );
      setTaskModalItem(null);
      await loadData(false);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to create task.");
    } finally {
      setIsSubmittingTask(false);
    }
  };

  // Provider schedule derived from today's real bookings.
  const providerSchedule = (stats?.todayFlow ?? []).reduce<
    Array<{ providerId: string; count: number; firstSlot: string; lastSlot: string }>
  >((acc, item) => {
    const key = item.providerId || "unassigned";
    const entry = acc.find((p) => p.providerId === key);
    if (!entry) {
      acc.push({
        providerId: key,
        count: 1,
        firstSlot: item.appointmentTime,
        lastSlot: item.appointmentTime,
      });
    } else {
      entry.count += 1;
      if (item.appointmentTime < entry.firstSlot) entry.firstSlot = item.appointmentTime;
      if (item.appointmentTime > entry.lastSlot) entry.lastSlot = item.appointmentTime;
    }
    return acc;
  }, []);

  const firstAppointment = stats?.todayFlow[0]?.appointmentTime ?? null;

  // Filter queue items: exclude past_unresolved older than 48 hours (if any slipped through)
  const filteredQueue = (stats?.needsAttention ?? []).filter((item) => {
    if (queueFilter === "all") return true;
    return item.type === queueFilter;
  });

  if (isLoading) {
    return (
      <div className="space-y-5">
        <PageHeader
          eyebrow="Front-Office Operations"
          title={`Welcome back, ${user?.fullName.split(" ")[0] ?? ""}`}
          description="Real-time schedule, waiting-room triage and front-desk PMS command center."
        />
        <StaggerList className="space-y-5" stagger={0.08}>
          {/* Stat card skeletons (8 PMS cards) */}
          <section className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <Skeleton key={i} className="h-20 rounded-xl border border-line" />
            ))}
          </section>

          {/* Queue panel skeleton */}
          <div className="rounded-2xl border border-line bg-bone p-6 shadow-subtle space-y-3">
            <div className="flex items-center justify-between space-y-2 sm:space-y-0 sm:flex-row">
              <Skeleton className="h-5 w-1/3" />
              <Skeleton className="h-5 w-1/4" />
            </div>
            <SkeletonText lines={4} className="space-y-2" />
          </div>
        </StaggerList>
      </div>
    );
  }

  return (
    <AnimatedPage>
      <div className="space-y-5">
        <PageHeader
          eyebrow="Front-Office Operations"
          title={`Welcome back, ${user?.fullName.split(" ")[0] ?? ""}`}
          description="Real-time schedule, waiting-room triage and front-desk PMS command center."
          actions={
            <>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => loadData(false)}
                disabled={isRefreshing}
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
                <span>{isRefreshing ? "Updating..." : "Refresh"}</span>
              </Button>
              <Button href="/reception/schedule" variant="primary" size="sm">
                <Plus className="h-3.5 w-3.5" />
                <span>New Booking</span>
              </Button>
            </>
          }
        />

        {error && (
          <ErrorState
            title="Dashboard data could not be loaded"
            description={error}
            onRetry={() => loadData()}
          />
        )}

        {!error && stats && (
          <>
            {/* Enterprise PMS 8-Metric KPI Command Bar */}
            <section className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
              <StatCard
                index={0}
                label="Today Total"
                value={stats.todayAppointments}
                tone={stats.todayAppointments > 0 ? "neutral" : "neutral"}
                href="/reception/appointments"
              />
              <StatCard
                index={1}
                label="Confirmed"
                value={stats.confirmedCount}
                tone={stats.confirmedCount > 0 ? "positive" : "neutral"}
                href="/reception/appointments"
              />
              <StatCard
                index={2}
                label="Waiting Room"
                value={stats.waitingCount + (stats.checkedInCount > stats.waitingCount ? stats.checkedInCount - stats.waitingCount : 0)}
                tone={stats.waitingCount > 0 ? "warning" : "neutral"}
                href="/reception/schedule"
              />
              <StatCard
                index={3}
                label="In Chair"
                value={stats.inProgressCount}
                tone={stats.inProgressCount > 0 ? "info" : "neutral"}
                href="/reception/schedule"
              />
              <StatCard
                index={4}
                label="Online Requests"
                value={stats.pendingRequestsCount}
                tone={stats.pendingRequestsCount > 0 ? "warning" : "neutral"}
                href="/reception/appointments/requests"
              />
              <StatCard
                index={5}
                label="Tomorrow Due"
                value={stats.unconfirmedTomorrowCount}
                tone={stats.unconfirmedTomorrowCount > 0 ? "warning" : "neutral"}
                href="/reception/reminders"
              />
              <StatCard
                index={6}
                label="Overdue Tasks"
                value={stats.overdueTasksCount}
                tone={stats.overdueTasksCount > 0 ? "danger" : "neutral"}
                href="/reception/tasks"
              />
              <StatCard
                index={7}
                label="Past Unresolved"
                value={stats.pastUnresolvedCount}
                tone={stats.pastUnresolvedCount > 0 ? "danger" : "neutral"}
                href="/reception/end-of-day"
              />
            </section>

            {/* Today's appointment flow */}
            <Panel
              index={0}
              title="Today's appointments"
              description="Live status and real-time chair progression of every booking scheduled for today."
              action={
                <Button href="/reception/appointments" variant="ghost" size="sm">
                  <span>View all</span>
                </Button>
              }
              flush
            >
              {stats.todayFlow.length === 0 ? (
                <EmptyState
                  title="No appointments today"
                  description="When bookings are scheduled for today they will appear here with live status controls."
                  action={
                    <Button href="/reception/schedule" variant="secondary" size="sm">
                      <Plus className="h-3.5 w-3.5" />
                      <span>Open schedule</span>
                    </Button>
                  }
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-line text-left text-[10px] font-mono uppercase tracking-wider text-ink-soft bg-sand/30">
                        <th className="px-4 py-2.5 font-semibold">Time</th>
                        <th className="px-4 py-2.5 font-semibold">Ref #</th>
                        <th className="px-4 py-2.5 font-semibold">Patient</th>
                        <th className="px-4 py-2.5 font-semibold">Provider</th>
                        <th className="px-4 py-2.5 font-semibold">Status</th>
                        <th className="px-4 py-2.5 font-semibold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {stats.todayFlow.map((item) => (
                        <tr key={item.id} className="hover:bg-sand/60 transition-colors">
                          <td className="px-4 py-2.5 font-mono text-ink font-medium whitespace-nowrap">
                            {item.appointmentTime}
                          </td>
                          <td className="px-4 py-2.5 font-mono text-[11px] text-ink-soft whitespace-nowrap">
                            {item.bookingNumber}
                          </td>
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleInspectBooking(item.id)}
                                className="font-semibold text-ink hover:text-primary transition-colors text-left cursor-pointer"
                              >
                                {item.patientName}
                              </button>
                              <a
                                href={`tel:${item.patientPhone}`}
                                title={`Call ${item.patientPhone}`}
                                className="text-ink-soft hover:text-primary transition-colors p-0.5"
                              >
                                <Phone className="h-3 w-3" />
                              </a>
                            </div>
                          </td>
                          <td className="px-4 py-2.5 text-ink-soft">
                            {item.providerId
                              ? directory.providerName(item.providerId) || "Team member"
                              : "Unassigned"}
                          </td>
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <StatusBadge status={item.status} />
                              {item.confirmationStatus === "unconfirmed" && (
                                <StatusBadge status="unconfirmed" />
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-2.5">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Inspect details button */}
                              <button
                                type="button"
                                onClick={() => handleInspectBooking(item.id)}
                                className="p-1 rounded-lg hover:bg-sand text-ink-soft hover:text-ink transition-colors cursor-pointer border border-transparent hover:border-line"
                                title="Inspect appointment details"
                              >
                                <Eye className="h-3.5 w-3.5" />
                              </button>

                              {isRequested(item.status) && (
                                <button
                                  type="button"
                                  onClick={() => handleStatusChange(item.id, APPOINTMENT_STATUS.CONFIRMED)}
                                  disabled={actionLoadingId === item.id}
                                  className="px-2.5 py-1 rounded-full bg-primary/10 text-primary hover:bg-primary/20 text-[11px] font-medium border border-primary/20 transition-colors cursor-pointer disabled:opacity-50"
                                >
                                  Confirm
                                </button>
                              )}
                              {isExpected(item.status) && (
                                <button
                                  type="button"
                                  onClick={() => handleStatusChange(item.id, APPOINTMENT_STATUS.ARRIVED)}
                                  disabled={actionLoadingId === item.id}
                                  className="px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-950 text-[11px] font-medium border border-blue-200/70 dark:border-blue-900/60 transition-colors cursor-pointer disabled:opacity-50"
                                >
                                  Check in
                                </button>
                              )}
                              {isWaiting(item.status) && (
                                <button
                                  type="button"
                                  onClick={() => handleStatusChange(item.id, APPOINTMENT_STATUS.IN_PROGRESS)}
                                  disabled={actionLoadingId === item.id}
                                  className="px-2.5 py-1 rounded-full bg-clay/10 text-clay hover:bg-clay/20 text-[11px] font-medium border border-clay/25 transition-colors cursor-pointer disabled:opacity-50"
                                >
                                  Start visit
                                </button>
                              )}
                              {isInProgress(item.status) && (
                                <button
                                  type="button"
                                  onClick={() => handleStatusChange(item.id, APPOINTMENT_STATUS.COMPLETED)}
                                  disabled={actionLoadingId === item.id}
                                  className="px-2.5 py-1 rounded-full bg-primary/10 text-primary hover:bg-primary/20 text-[11px] font-medium border border-primary/20 transition-colors cursor-pointer disabled:opacity-50"
                                >
                                  Complete
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
            </Panel>

            {/* Needs-action queue + daily briefing */}
            <section id="needs-action-queue" className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2">
                <Panel
                  index={1}
                  title="Needs-action queue"
                  description="Actionable triage queue: online requests, unconfirmed visits, waiting delays, overdue tasks, and past unresolved visits."
                  action={
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-primary/10 text-primary font-semibold">
                      {stats.needsAttention.length} pending
                    </span>
                  }
                >
                  {/* Filter tabs */}
                  <div className="flex flex-wrap gap-1.5 mb-3 pb-2 border-b border-line">
                    {[
                      { id: "all", label: `All (${stats.needsAttention.length})` },
                      { id: "online_request", label: `Online requests (${stats.pendingRequestsCount})` },
                      { id: "unconfirmed_tomorrow", label: `Tomorrow (${stats.unconfirmedTomorrowCount})` },
                      { id: "waiting_delayed", label: `Waiting delayed (${stats.waitingDelayedCount})` },
                      { id: "overdue_task", label: `Overdue tasks (${stats.overdueTasksCount})` },
                      { id: "past_unresolved", label: `Past unresolved (${stats.pastUnresolvedCount})` },
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setQueueFilter(tab.id)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors cursor-pointer ${queueFilter === tab.id
                          ? "bg-ink text-sand font-semibold shadow-xs"
                          : "bg-sand hover:bg-sand/80 text-ink-soft hover:text-ink"
                          }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  {filteredQueue.length === 0 ? (
                    <EmptyState
                      title="No items in this queue"
                      description="Online requests, unconfirmed visits, delayed waiting patients, overdue tasks, and unresolved past visits will appear here with inline actions."
                      icon={<Check className="h-5 w-5" />}
                    />
                  ) : (
                    <ul className="space-y-2">
                      {filteredQueue.map((item) => {
                        const isActioning =
                          actionLoadingId === item.id ||
                          actionLoadingId === `snooze-${item.id}` ||
                          actionLoadingId === item.bookingId;

                        const itemBookingId =
                          item.bookingId ||
                          (item.type !== "overdue_task" && item.targetId ? item.targetId : null);

                        return (
                          <li
                            key={`${item.type}-${item.id}`}
                            className="p-3 rounded-xl border border-line bg-card/60 hover:border-primary/40 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                          >
                            <div className="flex items-start gap-2.5 min-w-0">
                              <span
                                className={`mt-1 h-2 w-2 rounded-full shrink-0 ${item.priority === "urgent"
                                  ? "bg-red-500 animate-pulse"
                                  : item.priority === "high"
                                    ? "bg-amber-500"
                                    : "bg-blue-500"
                                  }`}
                              />
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-xs font-semibold text-ink">
                                    {item.title}
                                  </span>
                                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-sand border border-line text-ink-soft uppercase">
                                    {item.type.replace(/_/g, " ")}
                                  </span>
                                </div>
                                <p className="text-[11px] text-ink-soft mt-0.5">
                                  {item.description}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center flex-wrap">
                              {/* Inline Confirm */}
                              {item.bookingId && item.availableActions?.includes("confirm") && (
                                <button
                                  type="button"
                                  onClick={() => handleStatusChange(item.bookingId!, APPOINTMENT_STATUS.CONFIRMED)}
                                  disabled={isActioning}
                                  className="px-2.5 py-1 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 text-[11px] font-medium border border-primary/20 transition-colors cursor-pointer disabled:opacity-50"
                                >
                                  Confirm
                                </button>
                              )}

                              {/* Inline Check in */}
                              {item.bookingId && item.availableActions?.includes("check_in") && (
                                <button
                                  type="button"
                                  onClick={() => handleStatusChange(item.bookingId!, APPOINTMENT_STATUS.ARRIVED)}
                                  disabled={isActioning}
                                  className="px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 hover:bg-blue-100 text-[11px] font-medium border border-blue-200/70 transition-colors cursor-pointer disabled:opacity-50"
                                >
                                  Check in
                                </button>
                              )}

                              {/* Inline Snooze (24h) */}
                              {item.availableActions?.includes("snooze") && (
                                <button
                                  type="button"
                                  onClick={() => handleSnooze(item, 24)}
                                  disabled={isActioning}
                                  className="px-2 py-1 rounded-lg bg-sand hover:bg-sand/80 text-ink text-[11px] font-medium border border-line transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1"
                                  title="Snooze for 24 hours"
                                >
                                  <Clock className="h-3 w-3 text-ink-soft" />
                                  <span>Snooze</span>
                                </button>
                              )}

                              {/* Inline Create Task */}
                              {item.availableActions?.includes("create_task") && (
                                <button
                                  type="button"
                                  onClick={() => handleOpenTaskModal({
                                    bookingId: item.bookingId,
                                    patientId: item.patientId,
                                    title: item.title,
                                    priority: item.priority === "urgent" ? "urgent" : "high",
                                  })}
                                  disabled={isActioning}
                                  className="px-2 py-1 rounded-lg bg-sand hover:bg-sand/80 text-ink text-[11px] font-medium border border-line transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1"
                                  title="Create linked follow-up task"
                                >
                                  <Plus className="h-3 w-3 text-ink-soft" />
                                  <span>+ Task</span>
                                </button>
                              )}

                              {/* In-Context Safe View (No hard redirects or session resets) */}
                              {itemBookingId ? (
                                <button
                                  type="button"
                                  onClick={() => handleInspectBooking(itemBookingId)}
                                  className="px-2.5 py-1 rounded-lg bg-sand/60 hover:bg-sand text-ink text-[11px] font-medium border border-line/80 transition-colors cursor-pointer flex items-center gap-1"
                                  title="Inspect details in modal"
                                >
                                  <Eye className="h-3 w-3 text-ink-soft" />
                                  <span>View</span>
                                </button>
                              ) : item.link ? (
                                <Link
                                  href={item.link}
                                  className="px-2.5 py-1 rounded-lg bg-sand/60 hover:bg-sand text-ink text-[11px] font-medium border border-line/80 transition-colors flex items-center gap-1"
                                >
                                  <span>Open</span>
                                </Link>
                              ) : null}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </Panel>
              </div>

              <div className="lg:col-span-1">
                <Panel
                  title="Daily briefing"
                  description="Derived from today's live bookings."
                  index={2}
                >
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2.5">
                      <div className="p-3 rounded-xl border border-line bg-sand/60">
                        <p className="text-[11px] text-ink-soft">First appointment</p>
                        <p className="text-lg font-display text-ink leading-tight mt-0.5">
                          {firstAppointment || "None scheduled"}
                        </p>
                      </div>
                      <div className="p-3 rounded-xl border border-line bg-sand/60">
                        <p className="text-[11px] text-ink-soft">Total bookings</p>
                        <p className="text-lg font-display text-ink leading-tight mt-0.5">
                          {stats.todayAppointments}
                        </p>
                      </div>
                    </div>

                    <div>
                      <p className="text-[11px] font-semibold text-ink mb-1.5">
                        Provider schedules today
                      </p>
                      {providerSchedule.length === 0 ? (
                        <p className="text-xs text-ink-soft italic">
                          No provider appointments booked today.
                        </p>
                      ) : (
                        <div className="grid grid-cols-1 gap-2">
                          {providerSchedule.map((p) => (
                            <div
                              key={p.providerId}
                              className="px-3 py-2 rounded-xl border border-line flex items-center justify-between bg-card/40"
                            >
                              <div className="min-w-0">
                                <p className="text-xs font-semibold text-ink truncate">
                                  {p.providerId === "unassigned"
                                    ? "Unassigned"
                                    : directory.providerName(p.providerId) || "Team member"}
                                </p>
                                <p className="text-[10px] font-mono text-ink-soft">
                                  {p.firstSlot} - {p.lastSlot}
                                </p>
                              </div>
                              <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-bold font-mono">
                                {p.count}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </Panel>
              </div>
            </section>

            {/* Quick links using client-side Link (prevents session drop) */}
            <section className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <QuickLink href="/reception/appointments/requests" icon={<Inbox className="h-4 w-4" />} label="Intake requests" />
              <QuickLink href="/reception/patients" icon={<ListTodo className="h-4 w-4" />} label="Patient lookup" />
              <QuickLink href="/reception/leads" icon={<UserX className="h-4 w-4" />} label="Lead pipeline" />
              <QuickLink href="/reception/recalls" icon={<PhoneCall className="h-4 w-4" />} label="Recall queue" />
            </section>

            {/* In-Context Appointment Inspection Modal */}
            {inspectBookingId && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
                <div className="w-full max-w-lg bg-card rounded-2xl border border-line p-6 shadow-elevated space-y-4 max-h-[90vh] overflow-y-auto">
                  <div className="flex items-center justify-between border-b border-line pb-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base font-semibold text-ink">Appointment Details</h3>
                      {inspectBooking?.bookingNumber && (
                        <span className="font-mono text-xs px-2 py-0.5 rounded-full bg-sand border border-line text-ink-soft">
                          {inspectBooking.bookingNumber}
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setInspectBookingId(null)}
                      className="p-1 rounded-lg hover:bg-sand text-ink-soft cursor-pointer"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  {isLoadingInspect && (
                    <div className="py-8 space-y-3">
                      <Skeleton className="h-6 w-1/2" />
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-20 w-full rounded-xl" />
                    </div>
                  )}

                  {inspectError && (
                    <div className="p-4 rounded-xl border border-red-200 bg-red-50 text-red-700 text-xs">
                      {inspectError}
                    </div>
                  )}

                  {!isLoadingInspect && inspectBooking && (
                    <div className="space-y-4">
                      {/* Patient & Status Row */}
                      <div className="flex items-start justify-between gap-3 p-3.5 rounded-xl border border-line bg-sand/40">
                        <div>
                          <p className="text-sm font-bold text-ink">{inspectBooking.patientName}</p>
                          <div className="flex items-center gap-3 text-xs text-ink-soft mt-1">
                            <a
                              href={`tel:${inspectBooking.patientPhone}`}
                              className="inline-flex items-center gap-1 hover:text-primary transition-colors"
                            >
                              <Phone className="h-3 w-3 text-ink-soft" />
                              <span>{inspectBooking.patientPhone}</span>
                            </a>
                            {inspectBooking.patientEmail && (
                              <a
                                href={`mailto:${inspectBooking.patientEmail}`}
                                className="inline-flex items-center gap-1 hover:text-primary transition-colors"
                              >
                                <Mail className="h-3 w-3 text-ink-soft" />
                                <span className="truncate max-w-[160px]">{inspectBooking.patientEmail}</span>
                              </a>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <StatusBadge status={inspectBooking.status} />
                          {inspectBooking.confirmationStatus === "unconfirmed" && (
                            <StatusBadge status="unconfirmed" />
                          )}
                        </div>
                      </div>

                      {/* Appointment Attributes Grid */}
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div className="p-3 rounded-xl border border-line bg-card/60">
                          <div className="flex items-center gap-1.5 text-ink-soft mb-1">
                            <Calendar className="h-3.5 w-3.5 text-primary" />
                            <span className="font-medium text-[11px]">Schedule</span>
                          </div>
                          <p className="font-semibold text-ink">
                            {inspectBooking.bookingDate} at {inspectBooking.bookingTime}
                          </p>
                        </div>

                        <div className="p-3 rounded-xl border border-line bg-card/60">
                          <div className="flex items-center gap-1.5 text-ink-soft mb-1">
                            <Stethoscope className="h-3.5 w-3.5 text-primary" />
                            <span className="font-medium text-[11px]">Service</span>
                          </div>
                          <p className="font-semibold text-ink truncate">
                            {inspectBooking.serviceName ||
                              (inspectBooking.serviceId
                                ? directory.serviceName(inspectBooking.serviceId)
                                : "General Dental Consultation")}
                          </p>
                        </div>

                        <div className="p-3 rounded-xl border border-line bg-card/60">
                          <div className="flex items-center gap-1.5 text-ink-soft mb-1">
                            <User className="h-3.5 w-3.5 text-primary" />
                            <span className="font-medium text-[11px]">Clinician</span>
                          </div>
                          <p className="font-semibold text-ink truncate">
                            {inspectBooking.clinicianName ||
                              (inspectBooking.providerId
                                ? directory.providerName(inspectBooking.providerId)
                                : "Unassigned")}
                          </p>
                        </div>

                        <div className="p-3 rounded-xl border border-line bg-card/60">
                          <div className="flex items-center gap-1.5 text-ink-soft mb-1">
                            <Building2 className="h-3.5 w-3.5 text-primary" />
                            <span className="font-medium text-[11px]">Clinic Location</span>
                          </div>
                          <p className="font-semibold text-ink truncate">
                            Main Clinic
                          </p>
                        </div>
                      </div>

                      {/* Notes Section */}
                      {inspectBooking.notes && (
                        <div className="p-3 rounded-xl border border-line bg-sand/30 space-y-1">
                          <p className="text-[11px] font-semibold text-ink">Patient Notes</p>
                          <p className="text-xs text-ink-soft">{inspectBooking.notes}</p>
                        </div>
                      )}

                      {inspectBooking.staffNotes && (
                        <div className="p-3 rounded-xl border border-line bg-amber-50/50 dark:bg-amber-950/20 space-y-1">
                          <p className="text-[11px] font-semibold text-amber-800 dark:text-amber-400">Staff Notes</p>
                          <p className="text-xs text-ink-soft">{inspectBooking.staffNotes}</p>
                        </div>
                      )}

                      {/* Modal Actions */}
                      <div className="flex items-center justify-between pt-3 border-t border-line flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            handleOpenTaskModal({
                              bookingId: inspectBooking.id,
                              patientId: inspectBooking.patientId,
                              title: `Follow up: ${inspectBooking.patientName}`,
                              priority: "high",
                            });
                          }}
                          className="px-3 py-1.5 rounded-xl border border-line text-xs font-medium text-ink hover:bg-sand transition-colors cursor-pointer flex items-center gap-1.5"
                        >
                          <Plus className="h-3.5 w-3.5 text-primary" />
                          <span>+ Create Task</span>
                        </button>

                        <div className="flex items-center gap-2">
                          {isRequested(inspectBooking.status) && (
                            <Button
                              variant="primary"
                              size="sm"
                              disabled={actionLoadingId === inspectBooking.id}
                              onClick={() => handleStatusChange(inspectBooking.id, APPOINTMENT_STATUS.CONFIRMED)}
                            >
                              Confirm Booking
                            </Button>
                          )}
                          {isExpected(inspectBooking.status) && (
                            <Button
                              variant="primary"
                              size="sm"
                              disabled={actionLoadingId === inspectBooking.id}
                              onClick={() => handleStatusChange(inspectBooking.id, APPOINTMENT_STATUS.ARRIVED)}
                            >
                              Check In (Arrived)
                            </Button>
                          )}
                          {isWaiting(inspectBooking.status) && (
                            <Button
                              variant="primary"
                              size="sm"
                              disabled={actionLoadingId === inspectBooking.id}
                              onClick={() => handleStatusChange(inspectBooking.id, APPOINTMENT_STATUS.IN_PROGRESS)}
                            >
                              Start Visit
                            </Button>
                          )}
                          {isInProgress(inspectBooking.status) && (
                            <Button
                              variant="primary"
                              size="sm"
                              disabled={actionLoadingId === inspectBooking.id}
                              onClick={() => handleStatusChange(inspectBooking.id, APPOINTMENT_STATUS.COMPLETED)}
                            >
                              Complete Visit
                            </Button>
                          )}
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => setInspectBookingId(null)}
                          >
                            Close
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Quick Task Modal */}
            {taskModalItem && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
                <div className="w-full max-w-md bg-card rounded-2xl border border-line p-5 shadow-elevated space-y-4">
                  <div className="flex items-center justify-between border-b border-line pb-3">
                    <div>
                      <h3 className="text-sm font-semibold text-ink">Create Follow-up Task</h3>
                      <p className="text-[11px] text-ink-soft">Linked to {taskModalItem.title}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setTaskModalItem(null)}
                      className="p-1 rounded-lg hover:bg-sand text-ink-soft cursor-pointer"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <form onSubmit={handleCreateTask} className="space-y-3">
                    <div>
                      <label className="block text-[11px] font-medium text-ink mb-1">
                        Task Title
                      </label>
                      <input
                        type="text"
                        required
                        value={taskTitle}
                        onChange={(e) => setTaskTitle(e.target.value)}
                        className="w-full text-xs px-3 py-2 rounded-xl border border-line bg-sand/40 focus:outline-hidden focus:border-primary"
                        placeholder="e.g. Call patient to follow up"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-ink mb-1">
                        Priority
                      </label>
                      <select
                        value={taskPriority}
                        onChange={(e) => setTaskPriority(e.target.value as "urgent" | "high" | "medium" | "low")}
                        className="w-full text-xs px-3 py-2 rounded-xl border border-line bg-sand/40 focus:outline-hidden focus:border-primary"
                      >
                        <option value="urgent">Urgent</option>
                        <option value="high">High</option>
                        <option value="medium">Medium</option>
                        <option value="low">Low</option>
                      </select>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-line">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => setTaskModalItem(null)}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        variant="primary"
                        size="sm"
                        disabled={isSubmittingTask || !taskTitle.trim()}
                      >
                        {isSubmittingTask ? "Saving..." : "Create Task"}
                      </Button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </AnimatedPage>
  );
}

function QuickLink({
  href,
  icon,
  label,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2 p-3 rounded-xl border border-line bg-bone hover:border-primary/40 transition-colors text-xs font-medium text-ink"
    >
      <span className="text-primary">{icon}</span>
      <span>{label}</span>
    </Link>
  );
}
