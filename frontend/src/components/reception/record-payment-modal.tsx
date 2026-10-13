"use client";

import { useEffect, useState } from "react";
import {
  Banknote,
  CheckCircle2,
  CreditCard,
  DollarSign,
  History,
  Send,
  X,
} from "lucide-react";
import {
  getBookingPayments,
  recordBookingPayment,
  VisitPayment,
} from "@/lib/api";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";

interface RecordPaymentModalProps {
  bookingId: string | null;
  patientName?: string;
  isOpen: boolean;
  onClose: () => void;
  onPaymentRecorded?: () => void;
}

export function RecordPaymentModal({
  bookingId,
  patientName,
  isOpen,
  onClose,
  onPaymentRecorded,
}: RecordPaymentModalProps) {
  const { accessToken } = useAuth();
  const [amountRupees, setAmountRupees] = useState<string>("");
  const [method, setMethod] = useState<"cash" | "card" | "bank_transfer">("cash");
  const [notes, setNotes] = useState<string>("");
  const [existingPayments, setExistingPayments] = useState<VisitPayment[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !bookingId) {
      setAmountRupees("");
      setMethod("cash");
      setNotes("");
      setError(null);
      setSuccessMsg(null);
      setExistingPayments([]);
      return;
    }

    let isMounted = true;
    const fetchHistory = async () => {
      setIsLoadingHistory(true);
      try {
        const list = await getBookingPayments(bookingId, accessToken);
        if (isMounted) {
          setExistingPayments(list);
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (isMounted) {
          setIsLoadingHistory(false);
        }
      }
    };

    fetchHistory();
    return () => {
      isMounted = false;
    };
  }, [isOpen, bookingId, accessToken]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookingId) return;

    const parsedAmount = parseFloat(amountRupees.replace(/,/g, ""));
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError("Please enter a valid positive payment amount.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccessMsg(null);

    const amountCents = Math.round(parsedAmount * 100);

    try {
      const saved = await recordBookingPayment(
        bookingId,
        {
          amountCents,
          method,
          notes: notes.trim() || undefined,
          currency: "PKR",
        },
        accessToken
      );
      setExistingPayments((prev) => [...prev, saved]);
      setAmountRupees("");
      setNotes("");
      setSuccessMsg(`Payment of ${saved.amountFormatted} recorded successfully.`);
      if (onPaymentRecorded) {
        onPaymentRecorded();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to record payment.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-gray-100 dark:border-gray-800 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
                <Banknote className="h-4 w-4" />
              </span>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Record Visit Payment
              </h2>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {patientName ? `Patient: ${patientName}` : "Front desk visit payment collection."}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Alerts */}
        {error && (
          <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/50 text-xs text-red-600 dark:text-red-300">
            {error}
          </div>
        )}
        {successMsg && (
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Payment Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Amount (PKR)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-semibold text-xs">
                Rs
              </span>
              <input
                type="number"
                step="any"
                min="1"
                placeholder="e.g. 5000"
                value={amountRupees}
                onChange={(e) => setAmountRupees(e.target.value)}
                required
                className="w-full rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50 pl-10 pr-3 py-2.5 text-sm font-semibold text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Payment Method
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setMethod("cash")}
                className={`py-2 px-3 rounded-xl border text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                  method === "cash"
                    ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 font-semibold"
                    : "border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
                }`}
              >
                <Banknote className="h-3.5 w-3.5" />
                <span>Cash</span>
              </button>
              <button
                type="button"
                onClick={() => setMethod("card")}
                className={`py-2 px-3 rounded-xl border text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                  method === "card"
                    ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 font-semibold"
                    : "border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
                }`}
              >
                <CreditCard className="h-3.5 w-3.5" />
                <span>Card</span>
              </button>
              <button
                type="button"
                onClick={() => setMethod("bank_transfer")}
                className={`py-2 px-3 rounded-xl border text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                  method === "bank_transfer"
                    ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 font-semibold"
                    : "border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
                }`}
              >
                <Send className="h-3.5 w-3.5" />
                <span>Transfer</span>
              </button>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Notes (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Scaling & Polishing copay, invoice #1042"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50 px-3 py-2 text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div className="pt-2">
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isSubmitting}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              Record Payment
            </Button>
          </div>
        </form>

        {/* Existing Payments History for this booking */}
        <div className="border-t border-gray-100 dark:border-gray-800 pt-3 space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300">
            <History className="h-3.5 w-3.5 text-gray-400" />
            <span>Payments on this Appointment ({existingPayments.length})</span>
          </div>

          {isLoadingHistory ? (
            <p className="text-[11px] text-gray-400 py-1">Loading payments...</p>
          ) : existingPayments.length === 0 ? (
            <p className="text-[11px] text-gray-400 italic">No payments recorded yet for this visit.</p>
          ) : (
            <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
              {existingPayments.map((p) => (
                <div
                  key={p.id}
                  className="p-2.5 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/40 flex items-center justify-between text-xs"
                >
                  <div>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {p.amountFormatted}
                    </span>
                    <span className="ml-2 uppercase text-[10px] px-1.5 py-0.5 rounded bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 font-mono">
                      {p.method}
                    </span>
                    {p.notes && (
                      <p className="text-[11px] text-gray-500 italic mt-0.5">&quot;{p.notes}&quot;</p>
                    )}
                  </div>
                  <span className="text-[10px] text-gray-400">
                    {new Date(p.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end border-t border-gray-100 dark:border-gray-800 pt-3">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
