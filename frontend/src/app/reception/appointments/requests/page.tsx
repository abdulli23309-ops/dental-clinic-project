"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  Check,
  Clock,
  Inbox,
  Mail,
  Phone,
  RefreshCw,
  User,
  X,
} from "lucide-react";
import { toast } from "sonner";

import {
  getReceptionRequests,
  ReceptionRequestItem,
  rescheduleReceptionBooking,
  triageReceptionRequest,
} from "@/lib/api";
import { useAuth } from "@/components/providers/auth-provider";
import { Card } from "@/components/ui/card";
import { AnimatedPage } from "@/components/ui/animated-page";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorState } from "@/components/dashboard/states";

export default function ReceptionRequestsPage() {
  const { accessToken } = useAuth();

  const [requests, setRequests] = useState<ReceptionRequestItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("pending");
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [rescheduleId, setRescheduleId] = useState<string | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleTime, setRescheduleTime] = useState("");

  const loadRequests = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getReceptionRequests(statusFilter || undefined, accessToken);
      setRequests(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load requests.";
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    queueMicrotask(() => {
      loadRequests();
    });
  }, [statusFilter, accessToken]);

  const handleTriage = async (id: string, action: "confirm" | "decline") => {
    setActionLoadingId(id);
    try {
      await triageReceptionRequest(id, action, undefined, accessToken);
      await loadRequests();
      toast.success(action === "confirm" ? "Request confirmed." : "Request declined.");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to triage request.";
      setError(message);
      toast.error(message);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleReschedule = async (id: string) => {
    if (!rescheduleDate || !rescheduleTime) {
      toast.error("Please select both a date and time.");
      return;
    }
    setActionLoadingId(id);
    try {
      await rescheduleReceptionBooking(id, {
        bookingDate: rescheduleDate,
        bookingTime: rescheduleTime,
      }, accessToken);
      await loadRequests();
      setRescheduleId(null);
      setRescheduleDate("");
      setRescheduleTime("");
      toast.success("Request rescheduled.");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to reschedule request.";
      setError(message);
      toast.error(message);
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
  <AnimatedPage>
    <div className="space-y-6">
      {/* Back Link & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <Link
            href="/reception/appointments"
            className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Appointments</span>
          </Link>
          <h1 className="text-2xl font-display font-semibold text-gray-900 dark:text-white">
            Public Website Intake Requests
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Review, contact, and schedule appointments requested through the public booking wizard.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3.5 py-1.5 rounded-full border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-xs text-gray-700 dark:text-gray-300 shadow-xs focus:border-primary"
          >
            <option value="pending">Pending Triage</option>
            <option value="confirmed">Confirmed</option>
            <option value="cancelled">Declined / Cancelled</option>
            <option value="">All Requests</option>
          </select>

          <button
            onClick={loadRequests}
            className="p-2 rounded-full border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 shadow-xs cursor-pointer transition-colors"
            aria-label="Refresh requests queue"
          >
            <RefreshCw className="h-4 w-4 text-gray-600 dark:text-gray-300" />
          </button>
        </div>
      </div>

      {/* Requests Queue */}
      <Card surface="bone" shadow="subtle" className="overflow-hidden" hoverLift={true} index={0}>
        {isLoading ? (
          <div className="p-12 text-center text-xs font-mono text-gray-500">
            Loading intake queue...
          </div>
        ) : requests.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <Inbox className="h-8 w-8 text-gray-400 mx-auto" />
            <p className="text-sm font-semibold text-gray-900 dark:text-white">
              No intake requests found
            </p>
            <p className="text-xs text-gray-500">
              When patients request appointments online, they will appear in this triage queue.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {requests.map((req) => (
              <div
                key={req.id}
                className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-gray-50/60 dark:hover:bg-gray-800/30 transition-colors"
              >
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-sm text-gray-900 dark:text-white flex items-center gap-1.5">
                      <User className="h-4 w-4 text-gray-400" />
                      {req.fullName}
                    </span>
                    <span
                      className={`
                        px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase font-semibold
                        ${
                          req.status === "pending"
                            ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                            : req.status === "confirmed"
                            ? "bg-primary/10 text-primary font-bold"
                            : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                        }
                      `}
                    >
                      {req.status}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-gray-600 dark:text-gray-400">
                    <span className="inline-flex items-center gap-1">
                      <Phone className="h-3.5 w-3.5 text-primary" />
                      <a href={`tel:${req.phone}`} className="hover:underline font-mono">
                        {req.phone}
                      </a>
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Mail className="h-3.5 w-3.5 text-blue-600" />
                      <a href={`mailto:${req.email}`} className="hover:underline">
                        {req.email}
                      </a>
                    </span>
                    <span className="inline-flex items-center gap-1 font-mono">
                      <Calendar className="h-3.5 w-3.5 text-purple-600" />
                      Requested: <strong>{req.preferredDate}</strong> at <strong>{req.preferredTime}</strong>
                    </span>
                  </div>

                  {req.notes && (
                    <p className="text-xs text-gray-500 bg-gray-50 dark:bg-gray-800/60 p-2.5 rounded-xl border border-gray-100 dark:border-gray-800">
                      <strong>Patient Note:</strong> {req.notes}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {req.status === "pending" && (
                    <>
                      <button
                        onClick={() => handleTriage(req.id, "confirm")}
                        disabled={actionLoadingId === req.id}
                        className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-primary text-white text-xs font-semibold hover:bg-primary/90 shadow-xs transition-colors cursor-pointer"
                      >
                        <Check className="h-3.5 w-3.5" />
                        <span>Accept & Confirm</span>
                      </button>

                      <button
                        onClick={() => handleTriage(req.id, "decline")}
                        disabled={actionLoadingId === req.id}
                        className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full border border-gray-200 dark:border-gray-800 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 shadow-xs transition-colors cursor-pointer"
                      >
                        <X className="h-3.5 w-3.5" />
                        <span>Decline</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  </AnimatedPage>
  );
}
