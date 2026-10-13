"use client";

import { useEffect, useState, useMemo } from "react";
import {
  AlertCircle,
  Banknote,
  CheckCircle2,
  CreditCard,
  History,
  Printer,
  RotateCcw,
  Send,
  X,
} from "lucide-react";
import {
  getBookingPayments,
  recordBookingPayment,
  voidBookingPayment,
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
  const [amountChargedRupees, setAmountChargedRupees] = useState<string>("");
  const [method, setMethod] = useState<"cash" | "card" | "bank_transfer">("cash");
  const [notes, setNotes] = useState<string>("");
  const [existingPayments, setExistingPayments] = useState<VisitPayment[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Voiding state
  const [voidingPaymentId, setVoidingPaymentId] = useState<string | null>(null);
  const [voidReason, setVoidReason] = useState<string>("");
  const [isVoiding, setIsVoiding] = useState<boolean>(false);

  // Receipt viewing state
  const [receiptPayment, setReceiptPayment] = useState<VisitPayment | null>(null);

  // Fetch payments when open
  useEffect(() => {
    if (!isOpen || !bookingId) return;

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

  // Compute balance and charges from active (non-voided) payments
  const activePayments = useMemo(
    () => existingPayments.filter((p) => !p.isVoided),
    [existingPayments]
  );

  const totalChargedCents = useMemo(() => {
    if (activePayments.length === 0) return 0;
    const maxCharged = Math.max(
      ...activePayments.map((p) => p.amountChargedCents || p.amountCents)
    );
    return maxCharged;
  }, [activePayments]);

  const totalPaidCents = useMemo(() => {
    return activePayments.reduce((acc, p) => acc + p.amountCents, 0);
  }, [activePayments]);

  const balanceCents = Math.max(0, totalChargedCents - totalPaidCents);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookingId) return;

    const parsedPaid = parseFloat(amountRupees.replace(/,/g, ""));
    if (isNaN(parsedPaid) || parsedPaid <= 0) {
      setError("Please enter a valid positive payment amount.");
      return;
    }

    const parsedCharged = amountChargedRupees
      ? parseFloat(amountChargedRupees.replace(/,/g, ""))
      : parsedPaid;

    setIsSubmitting(true);
    setError(null);
    setSuccessMsg(null);

    const amountCents = Math.round(parsedPaid * 100);
    const chargedCents = Math.round(parsedCharged * 100);

    try {
      const saved = await recordBookingPayment(
        bookingId,
        {
          amountCents,
          amountChargedCents: chargedCents,
          method,
          notes: notes.trim() || undefined,
          currency: "PKR",
        },
        accessToken
      );
      setExistingPayments((prev) => [...prev, saved]);
      setAmountRupees("");
      setAmountChargedRupees("");
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

  const handleVoidPayment = async (paymentId: string) => {
    if (!bookingId) return;
    if (!voidReason.trim()) {
      setError("A reason is mandatory to void a payment.");
      return;
    }

    setIsVoiding(true);
    setError(null);
    try {
      const updated = await voidBookingPayment(
        bookingId,
        paymentId,
        voidReason.trim(),
        accessToken
      );
      setExistingPayments((prev) =>
        prev.map((p) => (p.id === paymentId ? updated : p))
      );
      setVoidingPaymentId(null);
      setVoidReason("");
      setSuccessMsg("Payment record has been voided.");
      if (onPaymentRecorded) {
        onPaymentRecorded();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to void payment.");
    } finally {
      setIsVoiding(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-5 max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-gray-100 dark:border-gray-800 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
                <Banknote className="h-4 w-4" />
              </span>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Visit Payment &amp; Balance
              </h2>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {patientName ? `Patient: ${patientName}` : "Front desk visit accounting and payment record."}
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
          <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/50 text-xs text-red-600 dark:text-red-300 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {successMsg && (
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Financial Summary Card: Charged, Paid, Balance */}
        <div className="grid grid-cols-3 gap-3 p-3.5 rounded-2xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700/60 text-xs">
          <div>
            <span className="text-[10px] uppercase font-mono text-gray-500 dark:text-gray-400 block">
              Total Charged
            </span>
            <span className="text-sm font-semibold text-gray-900 dark:text-white font-mono">
              Rs {(totalChargedCents / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-mono text-gray-500 dark:text-gray-400 block">
              Total Paid
            </span>
            <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 font-mono">
              Rs {(totalPaidCents / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-mono text-gray-500 dark:text-gray-400 block">
              Balance Due
            </span>
            <span
              className={`text-sm font-bold font-mono ${
                balanceCents === 0 && totalPaidCents > 0
                  ? "text-emerald-600 dark:text-emerald-400"
                  : balanceCents > 0
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-gray-700 dark:text-gray-300"
              }`}
            >
              {balanceCents === 0 && totalPaidCents > 0
                ? "Paid in Full"
                : `Rs ${(balanceCents / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
            </span>
          </div>
        </div>

        {/* Scrollable middle container */}
        <div className="space-y-4 overflow-y-auto pr-1 flex-1">
          {/* Payment Form */}
          <form onSubmit={handleSubmit} className="space-y-3 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Total Fee Charged (PKR)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-semibold text-xs">
                    Rs
                  </span>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    placeholder={
                      totalChargedCents > 0
                        ? String(totalChargedCents / 100)
                        : "e.g. 5000"
                    }
                    value={amountChargedRupees}
                    onChange={(e) => setAmountChargedRupees(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50 pl-10 pr-3 py-2 text-xs font-semibold text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Amount Paying Now (PKR) *
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
                    className="w-full rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50 pl-10 pr-3 py-2 text-xs font-semibold text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
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
                placeholder="e.g. Tooth #16 filling, front desk receipt"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50 px-3 py-2 text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div className="pt-1">
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

          {/* Void Reason Form (when voiding an item) */}
          {voidingPaymentId && (
            <div className="p-3 rounded-2xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/50 dark:bg-rose-950/30 space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-rose-800 dark:text-rose-300">
                <span>Void Payment Confirmation</span>
                <button
                  type="button"
                  onClick={() => setVoidingPaymentId(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <p className="text-[11px] text-rose-700 dark:text-rose-300">
                A reason is required to void this payment record. The record will remain audited.
              </p>
              <input
                type="text"
                placeholder="Mandatory reason for voiding (e.g. billing correction, refund)"
                value={voidReason}
                onChange={(e) => setVoidReason(e.target.value)}
                className="w-full rounded-xl border border-rose-300 dark:border-rose-800 bg-white dark:bg-gray-900 px-3 py-1.5 text-xs text-gray-900 dark:text-white focus:outline-none"
              />
              <div className="flex items-center justify-end gap-2 pt-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setVoidingPaymentId(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  isLoading={isVoiding}
                  onClick={() => handleVoidPayment(voidingPaymentId)}
                  className="bg-rose-600 hover:bg-rose-700 text-white"
                >
                  Confirm Void
                </Button>
              </div>
            </div>
          )}

          {/* Payments History for this visit */}
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
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {existingPayments.map((p) => (
                  <div
                    key={p.id}
                    className={`p-2.5 rounded-xl border flex items-center justify-between text-xs transition-colors ${
                      p.isVoided
                        ? "border-rose-100 dark:border-rose-900/40 bg-rose-50/20 dark:bg-rose-950/10 opacity-70"
                        : "border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/40"
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`font-semibold font-mono ${
                            p.isVoided
                              ? "line-through text-gray-400 dark:text-gray-500"
                              : "text-gray-900 dark:text-white"
                          }`}
                        >
                          {p.amountFormatted}
                        </span>
                        <span className="uppercase text-[10px] px-1.5 py-0.5 rounded bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 font-mono">
                          {p.method}
                        </span>
                        {p.isVoided && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 font-semibold">
                            VOIDED: {p.voidReason || "Voided"}
                          </span>
                        )}
                      </div>
                      {p.notes && (
                        <p className="text-[11px] text-gray-500 italic mt-0.5">&quot;{p.notes}&quot;</p>
                      )}
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        Recorded by {p.recordedByName || "Staff"} at{" "}
                        {new Date(p.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setReceiptPayment(p)}
                        className="h-7 px-2 text-[11px] text-gray-600 hover:text-gray-900 dark:text-gray-300"
                        title="View / Print payment record receipt"
                      >
                        <Printer className="h-3 w-3 mr-1" />
                        <span>Receipt</span>
                      </Button>

                      {!p.isVoided && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setVoidingPaymentId(p.id);
                            setVoidReason("");
                          }}
                          className="h-7 px-2 text-[11px] text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                          title="Void payment with recorded reason"
                        >
                          <RotateCcw className="h-3 w-3 mr-1" />
                          <span>Void</span>
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end border-t border-gray-100 dark:border-gray-800 pt-3">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>

      {/* The "Payment record, not a tax invoice" Receipt Modal */}
      {receiptPayment && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white text-gray-900 border border-gray-300 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 font-sans text-xs print:p-0 print:border-none print:shadow-none">
            {/* Disclaimer Banner at top */}
            <div className="border-b-2 border-dashed border-gray-300 pb-3 text-center space-y-1">
              <h3 className="text-base font-bold tracking-tight uppercase">
                Marlow Dental Clinic
              </h3>
              <p className="text-[11px] text-gray-500 font-mono">
                Front-Desk Patient Accounts
              </p>
              <div className="inline-block mt-1 px-3 py-1 bg-gray-100 text-gray-800 font-bold text-[11px] tracking-wide uppercase rounded-md border border-gray-300">
                Payment record, not a tax invoice
              </div>
            </div>

            {/* Receipt metadata */}
            <div className="space-y-2 py-1 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-500">Receipt Ref:</span>
                <span className="font-mono font-bold">
                  REC-{receiptPayment.id.slice(0, 8).toUpperCase()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Date &amp; Time:</span>
                <span className="font-mono">
                  {new Date(receiptPayment.createdAt).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Patient:</span>
                <span className="font-semibold">{patientName || "Clinic Patient"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Payment Method:</span>
                <span className="font-mono uppercase font-semibold">
                  {receiptPayment.method}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Cashier / Staff:</span>
                <span>{receiptPayment.recordedByName || "Reception Desk"}</span>
              </div>
              {receiptPayment.notes && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Notes:</span>
                  <span className="italic">{receiptPayment.notes}</span>
                </div>
              )}
            </div>

            {/* Financial breakdown */}
            <div className="border-t border-b border-gray-200 py-3 space-y-1.5 font-mono text-xs">
              {receiptPayment.amountChargedCents && receiptPayment.amountChargedCents > 0 ? (
                <div className="flex justify-between text-gray-600">
                  <span>Visit Fee Charged:</span>
                  <span>Rs {(receiptPayment.amountChargedCents / 100).toFixed(2)}</span>
                </div>
              ) : null}
              <div className="flex justify-between font-bold text-sm text-gray-900">
                <span>Amount Paid:</span>
                <span>{receiptPayment.amountFormatted}</span>
              </div>
              {receiptPayment.isVoided && (
                <div className="p-2 rounded bg-rose-50 border border-rose-200 text-rose-800 text-[11px] font-sans font-semibold text-center mt-2">
                  *** VOIDED RECORD ({receiptPayment.voidReason || "Voided"}) ***
                </div>
              )}
            </div>

            {/* Disclaimer Footer Notice */}
            <div className="text-center pt-2 space-y-1">
              <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">
                Payment record, not a tax invoice
              </p>
              <p className="text-[10px] text-gray-400">
                This receipt confirms payment collection at the front desk for clinic visit accounting.
              </p>
            </div>

            {/* Print & Close actions (hidden during print) */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-200 print:hidden">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setReceiptPayment(null)}
              >
                Close
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={() => window.print()}
                className="bg-gray-900 text-white hover:bg-black flex items-center gap-1.5"
              >
                <Printer className="h-3.5 w-3.5" />
                <span>Print Receipt</span>
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
