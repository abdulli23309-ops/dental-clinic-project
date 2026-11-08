"use client";

import React, { useState } from "react";
import { Gift, Copy, Check, Share2, Users, Award } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export interface ReferralInviteCardProps {
  referralCode?: string;
  invitedCount?: number;
  creditsEarned?: string;
  className?: string;
}

/**
 * Referral and Colleague Invite widget for Marlow SaaS.
 * Features one-click copy, toast confirmation, and referral metrics.
 */
export function ReferralInviteCard({
  referralCode = "DHDC-CARE-2026",
  invitedCount = 14,
  creditsEarned = "Rs. 35,000",
  className,
}: ReferralInviteCardProps) {
  const [copied, setCopied] = useState(false);

  const inviteUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/book?ref=${referralCode}`
      : `https://hiradental.com/book?ref=${referralCode}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    toast.success("Referral invitation link copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleWhatsAppShare = () => {
    const text = encodeURIComponent(
      `Book your premier dental consultation at Dr. Hira's Dental Care using my referral invitation link: ${inviteUrl}`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, "_blank");
  };

  return (
    <div
      className={cn(
        "p-6 rounded-3xl bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-slate-50 dark:from-emerald-950/30 dark:via-teal-950/20 dark:to-slate-900 border border-emerald-500/20 shadow-xs space-y-4 text-slate-900 dark:text-slate-100",
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
          <span className="truncate">{inviteUrl}</span>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={handleCopy}
          className="gap-1.5 rounded-xl shrink-0"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copied ? "Copied" : "Copy"}</span>
        </Button>

        <Button
          variant="secondary"
          size="sm"
          onClick={handleWhatsAppShare}
          className="gap-1.5 rounded-xl shrink-0"
          title="Share on WhatsApp"
        >
          <Share2 className="w-3.5 h-3.5 text-emerald-600" />
          <span className="hidden xs:inline">WhatsApp</span>
        </Button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 gap-3 pt-2 border-t border-emerald-500/10">
        <div className="p-3 rounded-2xl bg-white/70 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 flex items-center gap-3">
          <Users className="w-5 h-5 text-primary shrink-0" />
          <div>
            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">
              Referred Bookings
            </p>
            <p className="text-sm font-bold text-slate-900 dark:text-white">
              {invitedCount} Patients
            </p>
          </div>
        </div>

        <div className="p-3 rounded-2xl bg-white/70 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 flex items-center gap-3">
          <Award className="w-5 h-5 text-amber-500 shrink-0" />
          <div>
            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">
              Care Rewards Generated
            </p>
            <p className="text-sm font-bold text-slate-900 dark:text-white">
              {creditsEarned}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

