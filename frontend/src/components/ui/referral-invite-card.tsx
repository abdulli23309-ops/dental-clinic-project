"use client";

import React, { useState } from "react";
import { Gift, Copy, Check, Share2, Users, Award } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useClinicBranding } from "@/components/ui/clinic-logo";

export interface ReferralInviteCardProps {
  referralCode?: string;
  invitedCount?: number | null;
  creditsEarned?: string | number | null;
  isLoading?: boolean;
  isError?: boolean;
  clinicName?: string;
  className?: string;
}

/**
 * Referral and Colleague Invite widget.
 * Features one-click copy, toast confirmation, and referral metrics.
 * Correctly distinguishes genuine zero, missing/undefined (—), loading, and error states.
 */
export function ReferralInviteCard({
  referralCode,
  invitedCount,
  creditsEarned,
  isLoading = false,
  isError = false,
  clinicName,
  className,
}: ReferralInviteCardProps) {
  const [copied, setCopied] = useState(false);

  let dynamicClinicName = clinicName;
  try {
    const branding = useClinicBranding();
    if (!dynamicClinicName && (branding?.fullBrandName || branding?.shortBrandName)) {
      dynamicClinicName = branding.fullBrandName || branding.shortBrandName;
    }
  } catch {
    // Context may not be mounted
  }
  const resolvedClinicName = dynamicClinicName || "our practice";

  const inviteUrl =
    typeof window !== "undefined"
      ? (referralCode ? `${window.location.origin}/book?ref=${encodeURIComponent(referralCode)}` : `${window.location.origin}/book`)
      : (referralCode ? `/book?ref=${encodeURIComponent(referralCode)}` : `/book`);

  const handleCopy = () => {
    if (isLoading || isError) return;
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    toast.success("Referral invitation link copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleWhatsAppShare = () => {
    if (isLoading || isError) return;
    const text = encodeURIComponent(
      `Book your consultation at ${resolvedClinicName} using my referral invitation link: ${inviteUrl}`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, "_blank");
  };

  return (
    <div
      className={cn(
        "p-6 rounded-3xl bg-gradient-to-br from-primary/10 via-primary/5 to-slate-50 dark:from-primary/20 dark:via-primary/10 dark:to-slate-900 border border-primary/20 shadow-xs space-y-4 text-slate-900 dark:text-slate-100",
        className
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-primary text-white flex items-center justify-center shadow-xs shrink-0">
            <Gift className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm sm:text-base font-bold">
              Patient & Colleague Referral Program
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Share your direct care link with patients or invite clinical staff.
            </p>
          </div>
        </div>

        <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-mono font-bold bg-primary/10 text-primary border border-primary/20">
          <Award className="w-3 h-3" />
          <span>Active Partner</span>
        </span>
      </div>

      {/* Copy link input bar */}
      <div className="flex items-center gap-2 pt-1">
        <div className="flex-1 flex items-center px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-700 dark:text-slate-300 overflow-hidden">
          {isLoading ? (
            <div className="h-4 w-48 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" aria-label="Loading link" />
          ) : isError ? (
            <span className="text-xs text-slate-400 dark:text-slate-500 italic">Referral link unavailable</span>
          ) : (
            <span className="truncate">{inviteUrl}</span>
          )}
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={handleCopy}
          disabled={isLoading || isError}
          className="gap-1.5 rounded-xl shrink-0"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copied ? "Copied" : "Copy"}</span>
        </Button>

        <Button
          variant="secondary"
          size="sm"
          onClick={handleWhatsAppShare}
          disabled={isLoading || isError}
          className="gap-1.5 rounded-xl shrink-0"
          title="Share on WhatsApp"
        >
          <Share2 className="w-3.5 h-3.5 text-primary" />
          <span className="hidden xs:inline">WhatsApp</span>
        </Button>
      </div>

      {/* Metrics Row: Correctly distinguishes genuine zero, missing (—), loading, and error states */}
      <div className="grid grid-cols-2 gap-3 pt-2 border-t border-primary/10">
        <div className="p-3 rounded-2xl bg-white/70 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 flex items-center gap-3">
          <Users className="w-5 h-5 text-primary shrink-0" />
          <div className="min-w-0">
            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">
              Referred Bookings
            </p>
            <div className="text-sm font-bold text-slate-900 dark:text-white">
              {isLoading ? (
                <div
                  className="h-4 w-16 bg-slate-200 dark:bg-slate-700 rounded animate-pulse my-0.5"
                  aria-label="Loading referred bookings"
                />
              ) : isError ? (
                <span className="text-xs font-medium text-slate-400 dark:text-slate-500 italic">
                  Unavailable
                </span>
              ) : invitedCount !== undefined && invitedCount !== null ? (
                <span>
                  {invitedCount} {invitedCount === 1 ? "Patient" : "Patients"}
                </span>
              ) : (
                <span className="text-slate-400 dark:text-slate-500 font-mono">—</span>
              )}
            </div>
          </div>
        </div>

        <div className="p-3 rounded-2xl bg-white/70 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 flex items-center gap-3">
          <Award className="w-5 h-5 text-amber-500 shrink-0" />
          <div className="min-w-0">
            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">
              Care Rewards Generated
            </p>
            <div className="text-sm font-bold text-slate-900 dark:text-white">
              {isLoading ? (
                <div
                  className="h-4 w-14 bg-slate-200 dark:bg-slate-700 rounded animate-pulse my-0.5"
                  aria-label="Loading care rewards"
                />
              ) : isError ? (
                <span className="text-xs font-medium text-slate-400 dark:text-slate-500 italic">
                  Unavailable
                </span>
              ) : creditsEarned !== undefined && creditsEarned !== null && creditsEarned !== "" ? (
                <span>
                  {typeof creditsEarned === "number" ? `${creditsEarned} pts` : creditsEarned}
                </span>
              ) : (
                <span className="text-slate-400 dark:text-slate-500 font-mono">—</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ReferralInviteCard;
