"use client";

import React, { useEffect, useState } from "react";
import {
  Building2,
  CalendarCheck,
  Clock,
  Coffee,
  Info,
  MapPin,
  Phone,
  RefreshCw,
  Sparkles,
  UserCheck,
} from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { authorizedFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";

interface ScheduleShift {
  id: string;
  dayOfWeek: number;
  dayName: string;
  startTime: string;
  endTime: string;
  breakStartTime?: string | null;
  breakEndTime?: string | null;
  isWorking: boolean;
  branchName?: string;
  isDefaultSchedule?: boolean;
}

interface ScheduleData {
  user: {
    id: string;
    fullName: string;
    email: string;
    role: string;
    teamMemberId?: string | null;
  };
  branch: {
    id?: string | null;
    name: string;
    address: string;
    city: string;
    phone: string;
    hoursInfo?: string;
    isPrimary?: boolean;
  };
  shifts: ScheduleShift[];
}

export default function MySchedulePage() {
  const { user, accessToken } = useAuth();
  const [data, setData] = useState<ScheduleData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSchedule = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await authorizedFetch("/api/v1/admin/my-schedule", {}, accessToken);
      if (!res.ok) {
        throw new Error("Unable to load shift schedule.");
      }
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      setError(err?.message || "Failed to load schedule details.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (accessToken) {
      fetchSchedule();
    }
  }, [accessToken]);

  const userRole = user?.role || data?.user?.role || "Staff";

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12 animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <CalendarCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                My Shift Schedule
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Weekly shift allocation, break intervals, and assigned physical branch facility.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchSchedule}
            disabled={isLoading}
            className="gap-1.5 text-xs rounded-xl"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="h-44 rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse md:col-span-1" />
          <div className="h-44 rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse md:col-span-2" />
          <div className="h-72 rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse md:col-span-3" />
        </div>
      ) : error ? (
        <div className="p-8 rounded-2xl border border-rose-200 bg-rose-50 text-rose-800 text-center space-y-3">
          <p className="text-sm font-semibold">{error}</p>
          <Button variant="outline" size="sm" onClick={fetchSchedule} className="rounded-xl">
            Retry Connection
          </Button>
        </div>
      ) : (
        <>
          {/* Top Info Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Staff Identity Card */}
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Staff Identity
                  </span>
                  <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
                    Active Roster
                  </span>
                </div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  {user?.fullName || data?.user?.fullName || "Staff Member"}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {user?.email || data?.user?.email}
                </p>
              </div>

              <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                <span className="text-xs text-slate-500">System Role:</span>
                <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-primary/10 text-primary">
                  {userRole}
                </span>
              </div>
            </div>

            {/* Assigned Branch Facility */}
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs md:col-span-2 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-primary" />
                    Assigned Physical Branch
                  </span>
                  {data?.branch?.isPrimary && (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-primary text-white">
                      Primary Branch
                    </span>
                  )}
                </div>

                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  {data?.branch?.name || "Main Clinic Facility"}
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 text-xs text-slate-600 dark:text-slate-300">
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    <span>
                      {data?.branch?.address || "Clinical Facility"}, {data?.branch?.city || "Islamabad"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-primary shrink-0" />
                    <span>{data?.branch?.phone || "+92 51 2287955"}</span>
                  </div>
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs text-slate-500">
                <span>Facility Operational Hours:</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  {data?.branch?.hoursInfo || "Mon - Sat: 09:00 - 18:00"}
                </span>
              </div>
            </div>
          </div>

          {/* Weekly Shifts Section */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary" />
                  Weekly Shift Schedule
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Standard shifts and allocated rest breaks. Read-only roster.
                </p>
              </div>
              <span className="text-[11px] px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold self-start sm:self-auto">
                7-Day Cycle
              </span>
            </div>

            {/* Shift Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {data?.shifts?.map((shift) => (
                <div
                  key={shift.id || shift.dayOfWeek}
                  className="p-4 rounded-2xl border border-slate-200/70 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 hover:bg-slate-50 dark:hover:bg-slate-900/60 transition-colors flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-bold text-slate-900 dark:text-white">
                      {shift.dayName}
                    </span>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-emerald-100/80 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300">
                      On Duty
                    </span>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                      <span className="text-slate-400">Shift Hours:</span>
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {shift.startTime} – {shift.endTime}
                      </span>
                    </div>

                    {shift.breakStartTime && shift.breakEndTime ? (
                      <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                        <span className="text-slate-400 flex items-center gap-1">
                          <Coffee className="w-3 h-3 text-amber-500" /> Break:
                        </span>
                        <span className="font-medium text-slate-700 dark:text-slate-300">
                          {shift.breakStartTime} – {shift.breakEndTime}
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between text-slate-400">
                        <span>Break:</span>
                        <span>Standard rest interval</span>
                      </div>
                    )}

                    <div className="flex items-center justify-between text-slate-600 dark:text-slate-300 pt-2 border-t border-slate-200/50 dark:border-slate-800/60">
                      <span className="text-slate-400">Location:</span>
                      <span className="font-medium truncate max-w-[150px]">
                        {shift.branchName || data?.branch?.name || "Main Clinic"}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Shift Notice Banner */}
            <div className="flex items-start gap-3 p-4 rounded-2xl bg-primary/5 border border-primary/15 text-xs text-slate-600 dark:text-slate-300">
              <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <p>
                <strong>Schedule Administration Policy:</strong> For shift modifications, branch transfers, or planned leaves, please submit requests directly to your Practice Administrator or Clinic Manager at least 48 hours in advance.
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

