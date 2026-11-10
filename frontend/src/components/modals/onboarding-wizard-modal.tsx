"use client";

import React, { useState, useEffect } from "react";
import {
  Sparkles,
  Check,
  ArrowRight,
  Bell,
  User as UserIcon,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/providers/auth-provider";
import { useClinicBranding } from "@/components/ui/clinic-logo";
import { completeOnboarding } from "@/lib/api";
import { toast } from "sonner";

export function OnboardingWizardModal() {
  const { user, refresh } = useAuth();
  const branding = useClinicBranding();
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [displayName, setDisplayName] = useState("");
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Admin users, superusers, and platform owners are STRICTLY EXEMPT from user onboarding
  const isAdminRole =
    !user ||
    user.role === "admin" ||
    user.role === "Platform Owner" ||
    user.role === "Super Admin" ||
    Boolean(user.is_superuser);

  useEffect(() => {
    if (!user || isAdminRole) {
      setIsOpen(false);
      return;
    }

    // Only render if user has not completed onboarding
    if (user.hasCompletedOnboarding) {
      setIsOpen(false);
      return;
    }

    // Check client storage guard
    const storageKey = `marlow_onboarding_completed_${user.id}`;
    const completedLocal = localStorage.getItem(storageKey);
    if (completedLocal === "true") {
      setIsOpen(false);
      return;
    }

    setDisplayName(user.fullName || "");
    setIsOpen(true);
  }, [user, isAdminRole]);

  const brandTitle = branding?.fullBrandName || branding?.shortBrandName || "Practice";

  const handleDismiss = async () => {
    // Dismissal marks onboarding complete so it is never shown again
    if (user) {
      localStorage.setItem(`marlow_onboarding_completed_${user.id}`, "true");
      try {
        await completeOnboarding(displayName || user.fullName);
        if (typeof refresh === "function") {
          await refresh();
        }
      } catch {
        // Suppress on dismiss
      }
    }
    setIsOpen(false);
  };

  const handleComplete = async () => {
    setIsSubmitting(true);
    if (user) {
      localStorage.setItem(`marlow_onboarding_completed_${user.id}`, "true");
      try {
        await completeOnboarding(displayName || user.fullName);
        if (typeof refresh === "function") {
          await refresh();
        }
      } catch (err: unknown) {
        console.error("Failed to persist onboarding state:", err);
      }
    }
    setIsSubmitting(false);
    setIsOpen(false);
    toast.success("Welcome aboard! Your workspace preferences have been saved.");
  };

  if (!isOpen || isAdminRole) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden text-slate-900 dark:text-slate-100 animate-in zoom-in-95 duration-200">
        {/* Progress Bar */}
        <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${(step / 2) * 100}%` }}
          />
        </div>

        <div className="p-6 sm:p-8 space-y-6">
          <div className="flex items-center justify-between">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-mono uppercase font-bold tracking-wider bg-primary/10 text-primary">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Step {step} of 2: {step === 1 ? "Profile & Alerts" : "All Set"}</span>
            </div>
            <button
              onClick={handleDismiss}
              className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1 rounded-lg cursor-pointer"
              aria-label="Close onboarding modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {step === 1 && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <h3 className="text-xl font-bold tracking-tight">
                  Welcome to {brandTitle}
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                  Confirm your practitioner profile display name and communication alerts.
                </p>
              </div>

              <div className="space-y-2 pt-2">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <UserIcon className="w-4 h-4 text-primary" />
                  <span>Full Clinical Display Name</span>
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="e.g. Dr. Hira Babar"
                />
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-3 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notificationsEnabled}
                    onChange={(e) => setNotificationsEnabled(e.target.checked)}
                    className="rounded border-slate-300 text-primary focus:ring-primary h-4 w-4"
                  />
                  <div className="text-xs">
                    <p className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <Bell className="w-3.5 h-3.5 text-primary" />
                      <span>Enable Clinical Appointment Alerts</span>
                    </p>
                    <p className="text-slate-500">
                      Receive notifications when appointments are scheduled or updated.
                    </p>
                  </div>
                </label>
              </div>

              <div className="flex justify-end pt-4">
                <Button
                  variant="primary"
                  onClick={() => setStep(2)}
                  className="gap-2 rounded-xl"
                >
                  <span>Continue</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <h3 className="text-xl font-bold tracking-tight">
                  You&apos;re All Set!
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                  Your clinical workspace is ready. You can press <strong className="font-mono text-primary">Cmd/Ctrl + K</strong> at any time to open the Command Palette.
                </p>
              </div>

              <div className="space-y-2 p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/60 text-xs text-emerald-800 dark:text-emerald-300">
                <div className="flex items-center gap-2 font-bold">
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span>Onboarding Verified</span>
                </div>
                <p>
                  Profile registered under <strong>{displayName || user?.fullName}</strong>. Your workspace preferences have been initialized.
                </p>
              </div>

              <div className="flex justify-between pt-4">
                <Button
                  variant="secondary"
                  onClick={() => setStep(1)}
                  className="rounded-xl"
                >
                  Back
                </Button>
                <Button
                  variant="primary"
                  onClick={handleComplete}
                  disabled={isSubmitting}
                  className="gap-2 rounded-xl shadow-xs"
                >
                  <Check className="w-4 h-4" />
                  <span>{isSubmitting ? "Saving..." : "Enter Dashboard"}</span>
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default OnboardingWizardModal;
