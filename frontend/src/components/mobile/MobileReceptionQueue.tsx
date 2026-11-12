"use client";

import React, { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Clock,
  User,
  CheckCircle2,
  AlertTriangle,
  Play,
  Check,
  X,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Filter,
} from "lucide-react";
import { ReceptionBooking } from "@/lib/api";
import { isExpected, isWaiting, isInProgress, isCompleted, isCancelled, APPOINTMENT_STATUS } from "@/lib/statuses";
import { tap } from "@/lib/haptics";

interface MobileReceptionQueueProps {
  bookings: ReceptionBooking[];
  directory: {
    providerName: (id?: string | null) => string | null | undefined;
    serviceName: (id?: string | null) => string | null | undefined;
  };
  onConfirm: (id: string) => void;
  onStatusChange: (id: string, newStatus: string) => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

type QueueTab = "waiting" | "in_chair" | "done" | "all";

export function MobileReceptionQueue({
  bookings,
  directory,
  onConfirm,
  onStatusChange,
  onRefresh,
  isRefreshing = false,
}: MobileReceptionQueueProps) {
  const [activeTab, setActiveTab] = useState<QueueTab>("waiting");
  const [search, setSearch] = useState("");

  // Categorize counts
  const waitingCount = bookings.filter((b) => isWaiting(b.status) || isExpected(b.status)).length;
  const inChairCount = bookings.filter((b) => isInProgress(b.status)).length;
  const doneCount = bookings.filter((b) => isCompleted(b.status)).length;
  const confirmedCount = bookings.filter((b) => b.confirmationStatus === "confirmed").length;

  const filteredBookings = bookings.filter((b) => {
    // Tab filter
    if (activeTab === "waiting" && !(isWaiting(b.status) || isExpected(b.status))) return false;
    if (activeTab === "in_chair" && !isInProgress(b.status)) return false;
    if (activeTab === "done" && !isCompleted(b.status)) return false;

    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase();
      const patientMatch = (b.patientName || "").toLowerCase().includes(q);
      const phoneMatch = (b.patientPhone || "").toLowerCase().includes(q);
      const docMatch = (directory.providerName(b.providerId) || "").toLowerCase().includes(q);
      return patientMatch || phoneMatch || docMatch;
    }
    return true;
  });

  return (
    <div className="w-full space-y-4 pb-20">
      {/* 1. Horizontal KPI Snap Scroller */}
      <div className="flex gap-2.5 overflow-x-auto no-scrollbar snap-x -mx-4 px-4 pt-1">
        <div className="snap-start shrink-0 w-32 p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/70 dark:border-amber-900/50 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-amber-700 dark:text-amber-400 block">
            Waiting / Arrived
          </span>
          <span className="text-2xl font-bold font-mono text-amber-900 dark:text-amber-200 mt-0.5 block tabular-nums">
            {waitingCount}
          </span>
        </div>

        <div className="snap-start shrink-0 w-32 p-3 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200/70 dark:border-blue-900/50 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-blue-700 dark:text-blue-400 block">
            In Chair
          </span>
          <span className="text-2xl font-bold font-mono text-blue-900 dark:text-blue-200 mt-0.5 block tabular-nums">
            {inChairCount}
          </span>
        </div>

        <div className="snap-start shrink-0 w-32 p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/70 dark:border-emerald-900/50 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-400 block">
            Completed
          </span>
          <span className="text-2xl font-bold font-mono text-emerald-900 dark:text-emerald-200 mt-0.5 block tabular-nums">
            {doneCount}
          </span>
        </div>

        <div className="snap-start shrink-0 w-32 p-3 rounded-2xl bg-primary/10 border border-primary/20 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-primary block">
            Confirmed
          </span>
          <span className="text-2xl font-bold font-mono text-primary mt-0.5 block tabular-nums">
            {confirmedCount}
          </span>
        </div>
      </div>

      {/* 2. Search & Pull-to-refresh Trigger */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search patient, phone, doctor..."
            className="w-full h-11 pl-10 pr-3 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
        {onRefresh && (
          <button
            type="button"
            onClick={() => {
              tap(6);
              onRefresh();
            }}
            disabled={isRefreshing}
            className="w-11 h-11 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-300 active:scale-95 transition-transform shrink-0 cursor-pointer"
            aria-label="Refresh appointments queue"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin text-primary" : ""}`} />
          </button>
        )}
      </div>

      {/* 3. Segmented Filter Tabs (44px) */}
      <div className="flex items-center p-1 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 h-11">
        {(
          [
            { id: "waiting", label: "Waiting", count: waitingCount },
            { id: "in_chair", label: "In Chair", count: inChairCount },
            { id: "done", label: "Done", count: doneCount },
            { id: "all", label: "All", count: bookings.length },
          ] as const
        ).map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                tap(6);
                setActiveTab(tab.id);
              }}
              className={`flex-1 h-9 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 relative transition-all cursor-pointer ${
                isActive
                  ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <span>{tab.label}</span>
              <span className={`text-[10px] px-1 py-0.2 rounded-full ${isActive ? "bg-primary/10 text-primary font-bold" : "text-slate-400"}`}>
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* 4. Queue Cards with Swipe & Visible Touch Controls */}
      <div className="space-y-3">
        {filteredBookings.length === 0 ? (
          <div className="p-8 text-center rounded-2xl bg-white/60 dark:bg-slate-900/60 border border-dashed border-slate-200 dark:border-slate-800">
            <Clock className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              No appointments in this queue
            </p>
          </div>
        ) : (
          filteredBookings.map((b) => {
            const providerName = directory.providerName(b.providerId) || "Clinical Provider";
            const serviceName = directory.serviceName(b.serviceId) || "Dental Consultation";

            const handleSwipeEnd = (_: any, info: { offset: { x: number } }) => {
              if (info.offset.x > 85) {
                // Swiped right: Trigger primary forward status action
                tap(12);
                if (b.confirmationStatus === "unconfirmed") {
                  onConfirm(b.id);
                } else if (isExpected(b.status)) {
                  onStatusChange(b.id, APPOINTMENT_STATUS.ARRIVED);
                } else if (isWaiting(b.status)) {
                  onStatusChange(b.id, APPOINTMENT_STATUS.IN_PROGRESS);
                } else if (isInProgress(b.status)) {
                  onStatusChange(b.id, APPOINTMENT_STATUS.COMPLETED);
                }
              } else if (info.offset.x < -85) {
                // Swiped left: Trigger cancellation / no-show action
                tap(12);
                if (isWaiting(b.status)) {
                  onStatusChange(b.id, APPOINTMENT_STATUS.NO_SHOW);
                } else if (isExpected(b.status)) {
                  onStatusChange(b.id, APPOINTMENT_STATUS.CANCELLED);
                }
              }
            };

            return (
              <div key={b.id} className="relative overflow-hidden rounded-2xl">
                {/* Background Swipe Action Indicators */}
                <div className="absolute inset-0 flex items-center justify-between px-5 rounded-2xl bg-slate-100 dark:bg-slate-800 pointer-events-none">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Advance Status</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-rose-600 dark:text-rose-400">
                    <span>Cancel / No-Show</span>
                    <X className="w-4 h-4" />
                  </div>
                </div>

                {/* Foreground Drag Card */}
                <motion.div
                  layout
                  drag="x"
                  dragConstraints={{ left: 0, right: 0 }}
                  dragElastic={0.4}
                  onDragEnd={handleSwipeEnd}
                  className="relative rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 p-4 shadow-xs"
                >
                {/* Top Status & Token/Time Bar */}
                <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-bold text-slate-900 dark:text-white tabular-nums">
                      {b.bookingTime || "09:00 AM"}
                    </span>
                    <span className="text-[11px] text-slate-400 dark:text-slate-500">
                      {b.bookingDate}
                    </span>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider ${
                      isExpected(b.status)
                        ? "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                        : isWaiting(b.status)
                        ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                        : isInProgress(b.status)
                        ? "bg-clay/15 text-clay"
                        : isCompleted(b.status)
                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                        : "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
                    }`}
                  >
                    {b.status.replace("_", " ")}
                  </span>
                </div>

                {/* Patient Information */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <Link
                      href={`/reception/patients/${b.patientId}`}
                      className="font-serif text-base font-bold text-slate-900 dark:text-white hover:text-primary transition-colors flex items-center gap-1.5"
                    >
                      <span>{b.patientName || "Walk-In Patient"}</span>
                    </Link>
                    <p className="text-xs text-primary font-medium mt-0.5">
                      {serviceName} · {providerName}
                    </p>
                  </div>

                  {b.patientPhone && (
                    <a
                      href={`tel:${b.patientPhone}`}
                      onClick={() => tap(6)}
                      className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 active:scale-95 transition-transform"
                      aria-label="Call patient"
                    >
                      <Phone className="w-4 h-4" />
                    </a>
                  )}
                </div>

                {/* Action Buttons (Strictly >= 44px Height) */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  {b.confirmationStatus === "unconfirmed" && (
                    <button
                      type="button"
                      onClick={() => {
                        tap(8);
                        onConfirm(b.id);
                      }}
                      className="h-11 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer col-span-2"
                    >
                      <Check className="w-4 h-4" />
                      <span>Confirm Appointment</span>
                    </button>
                  )}

                  {isExpected(b.status) && (
                    <button
                      type="button"
                      onClick={() => {
                        tap(10);
                        onStatusChange(b.id, APPOINTMENT_STATUS.ARRIVED);
                      }}
                      className="h-11 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm transition-colors cursor-pointer col-span-2"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Mark Patient Arrived</span>
                    </button>
                  )}

                  {isWaiting(b.status) && (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          tap(10);
                          onStatusChange(b.id, APPOINTMENT_STATUS.IN_PROGRESS);
                        }}
                        className="h-11 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-primary/25 transition-colors cursor-pointer"
                      >
                        <Play className="w-3.5 h-3.5" />
                        <span>Start In Chair</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          tap(8);
                          onStatusChange(b.id, APPOINTMENT_STATUS.NO_SHOW);
                        }}
                        className="h-11 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>No-Show</span>
                      </button>
                    </>
                  )}

                  {isInProgress(b.status) && (
                    <button
                      type="button"
                      onClick={() => {
                        tap(10);
                        onStatusChange(b.id, APPOINTMENT_STATUS.COMPLETED);
                      }}
                      className="h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-colors cursor-pointer col-span-2"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Complete Procedure</span>
                    </button>
                  )}
                </div>
              </motion.div>
              </div>
            );
          })
        )}
      </div>

      {/* 5. Sticky + Walk-In FAB */}
      <div className="fixed bottom-[calc(env(safe-area-inset-bottom,0px)+16px)] right-4 z-40">
        <Link
          href="/reception/appointments/new"
          onClick={() => tap(12)}
          className="h-13 px-5 rounded-full bg-primary text-primary-foreground font-semibold text-xs flex items-center gap-2 shadow-xl shadow-primary/35 active:scale-95 transition-transform"
        >
          <Plus className="w-4 h-4" />
          <span>New Walk-In</span>
        </Link>
      </div>
    </div>
  );
}
