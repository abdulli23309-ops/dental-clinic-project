"use client";

import { useEffect, useRef, useState } from "react";
import {
  Camera,
  Check,
  Clock,
  Loader2,
  LogOut,
  RotateCcw,
  ShieldCheck,
  Timer,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { useAuth } from "@/components/providers/auth-provider";
import { AnimatedPage } from "@/components/ui/animated-page";
import { resetUserAvatar, resolveMediaUrl, uploadUserAvatar } from "@/lib/api";

export default function AdminAccountPage() {
  const { user, accessToken, logout, updateInactivity, setUser } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [enabled, setEnabled] = useState(true);
  const [timeoutMinutes, setTimeoutMinutes] = useState(15);
  const [warningSeconds, setWarningSeconds] = useState(60);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isResettingAvatar, setIsResettingAvatar] = useState(false);

  useEffect(() => {
    if (user) {
      queueMicrotask(() => {
        setEnabled(user.inactivityEnabled !== false);
        setTimeoutMinutes(user.inactivityTimeoutMinutes ?? 15);
        setWarningSeconds(user.inactivityWarningSeconds ?? 60);
      });
    }
  }, [user]);

  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file (JPG, PNG, WEBP).");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Avatar image size must be under 10MB.");
      return;
    }

    setIsUploadingAvatar(true);
    try {
      const updatedUser = await uploadUserAvatar(file, accessToken);
      setUser(updatedUser);
      toast.success("Profile photo updated successfully!");
    } catch (err: any) {
      toast.error(err.message || "Failed to upload avatar.");
    } finally {
      setIsUploadingAvatar(false);
      if (e.target) e.target.value = "";
    }
  };

  const handleResetAvatar = async () => {
    setIsResettingAvatar(true);
    try {
      const updatedUser = await resetUserAvatar(accessToken);
      setUser(updatedUser);
      toast.success("Account photo reset to Our Team default.");
    } catch (err: any) {
      toast.error(err.message || "Failed to reset avatar.");
    } finally {
      setIsResettingAvatar(false);
    }
  };

  const handleSaveInactivity = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);
    setSaveError("");

    try {
      await updateInactivity({
        inactivityEnabled: enabled,
        inactivityTimeoutMinutes: Number(timeoutMinutes),
        inactivityWarningSeconds: Number(warningSeconds),
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      setSaveError(err.message || "Failed to save inactivity settings.");
    } finally {
      setIsSaving(false);
    }
  };

  const resolvedAvatar = user?.avatarUrl ? resolveMediaUrl(user.avatarUrl) : null;
  const hasPersonalOverride = Boolean(user?.personalAvatarUrl);

  return (
    <AnimatedPage>
      <div className="space-y-6 max-w-3xl">
        <div className="border-b border-line pb-4">
          <p className="eyebrow mb-1">Administrative Profile</p>
          <h1 className="text-2xl sm:text-3xl font-display text-ink font-normal">
            Staff Account &amp; Security
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-ink-soft">
            Current authenticated session credentials, personal account avatar, inactivity policies, and security parameters.
          </p>
        </div>

        {/* Profile Card with Interactive Two-Tier Avatar Upload */}
        <Card surface="cream" shadow="card" className="p-6 sm:p-8 space-y-6" hoverLift={true} index={0}>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            {/* Interactive Avatar Container */}
            <div className="relative group shrink-0">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={handleAvatarFileChange}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingAvatar}
                className="relative h-20 w-20 sm:h-24 sm:w-24 rounded-full overflow-hidden bg-forest text-[#FAF7F2] grid place-items-center text-xl font-display shadow-md border-2 border-forest/20 group cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-all hover:scale-105"
                title="Click to upload personal account photo"
                aria-label="Upload personal account photo"
              >
                {resolvedAvatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={resolvedAvatar}
                    alt={user?.fullName || "User Avatar"}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span>
                    {user?.fullName
                      ?.split(" ")
                      .map((n) => n[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase() || "HD"}
                  </span>
                )}

                {/* Camera Overlay on Hover */}
                <div className="absolute inset-0 bg-black/60 text-white flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-xs">
                  {isUploadingAvatar ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                  ) : (
                    <>
                      <Camera className="h-5 w-5 mb-0.5" />
                      <span className="text-[10px] font-semibold uppercase tracking-wider">Change</span>
                    </>
                  )}
                </div>
              </button>
            </div>

            {/* User Meta & Action Buttons */}
            <div className="space-y-2 flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-display text-ink font-semibold truncate">
                  {user?.fullName}
                </h2>
                <span className="rounded-full bg-forest/10 px-2.5 py-0.5 text-[10px] font-semibold text-forest uppercase tracking-wider">
                  {user?.role}
                </span>
                <span className="rounded-full bg-emerald-100 dark:bg-emerald-950 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-800 dark:text-emerald-300">
                  Active Staff
                </span>
              </div>
              <p className="text-xs text-ink-soft truncate font-mono">{user?.email}</p>

              {/* Avatar Action Buttons */}
              <div className="pt-2 flex flex-wrap items-center gap-2.5">
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingAvatar}
                  className="gap-1.5 text-xs rounded-full px-3.5 py-1.5"
                >
                  {isUploadingAvatar ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Upload className="h-3.5 w-3.5" />
                  )}
                  <span>Upload Photo</span>
                </Button>

                {hasPersonalOverride && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleResetAvatar}
                    disabled={isResettingAvatar}
                    className="gap-1.5 text-xs rounded-full px-3.5 py-1.5"
                  >
                    {isResettingAvatar ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <RotateCcw className="h-3.5 w-3.5" />
                    )}
                    <span>Reset to Team Default</span>
                  </Button>
                )}
              </div>

              <p className="text-[11px] text-ink-soft/80 italic pt-1">
                Personal account avatar is isolated to internal dashboard navigation and profile cards. It will never overwrite the public doctor portrait in Our Team.
              </p>
            </div>
          </div>

        <div className="space-y-3 pt-4 border-t border-line/60 text-xs text-ink-soft">
          <div className="flex justify-between py-1 border-b border-line/40">
            <span>Account Identifier:</span>
            <span className="font-mono text-ink">{user?.id}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-line/40">
            <span>Authorization Scope:</span>
            <span className="font-medium text-ink">Global Administrator (Full Access)</span>
          </div>
          <div className="flex justify-between py-1 border-b border-line/40">
            <span>Authentication Mechanism:</span>
            <span className="text-ink">
              7-Day In-Memory JWT + 7-Day HttpOnly Refresh Rotation (35-min silent threshold &amp; FIFO queue)
            </span>
          </div>
          <div className="flex justify-between py-1 border-b border-line/40">
            <span>Session Invalidation:</span>
            <span className="text-ink">
              Instant server-side session revocation on logout or timeout
            </span>
          </div>
        </div>

        <div className="pt-4 border-t border-line/60 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-ink-soft">
            <ShieldCheck className="h-4 w-4 text-forest" />
            <span>Server-validated active session</span>
          </div>

          <Button onClick={() => logout(false)} variant="secondary" size="sm">
            <LogOut className="h-3.5 w-3.5 mr-1" />
            <span>Sign out of session</span>
          </Button>
        </div>
      </Card>

      {/* Inactivity Security Configuration */}
      <Card surface="cream" shadow="card" className="p-6 sm:p-8 space-y-6" hoverLift={true} index={1}>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-forest dark:text-emerald-400">
              <Timer className="h-5 w-5" />
              <h2 className="font-display text-lg text-ink font-semibold">
                Inactivity &amp; Session Auto-Lock
              </h2>
            </div>
            <p className="text-xs text-ink-soft leading-relaxed max-w-xl">
              Configure automatic session logout to safeguard patient health information and clinic
              data when the administrator workstation is left unattended.
            </p>
          </div>
        </div>

        <form onSubmit={handleSaveInactivity} className="space-y-5 pt-2">
          {saveSuccess && (
            <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
              <Check className="h-4 w-4 text-emerald-600" />
              <span>Inactivity settings saved successfully.</span>
            </div>
          )}

          {saveError && (
            <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-300">
              {saveError}
            </div>
          )}

          <div className="flex items-center justify-between p-4 rounded-xl border border-line bg-bone">
            <div>
              <p className="text-xs font-semibold text-ink">Enable Auto-Logout on Inactivity</p>
              <p className="text-[11px] text-ink-soft">
                Tracks user mouse, keyboard, and touch interactions (background API traffic is excluded).
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-sand/80 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-active:after:scale-x-[1.12] peer-checked:bg-forest"></div>
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-ink">
                Inactivity Timeout (minutes)
              </label>
              <select
                disabled={!enabled}
                value={timeoutMinutes}
                onChange={(e) => setTimeoutMinutes(Number(e.target.value))}
                className="w-full rounded-lg border border-line bg-bone px-3 py-2 text-xs text-ink focus:outline-none focus:ring-1 focus:ring-forest disabled:opacity-50"
              >
                <option value={5}>5 minutes (High Security)</option>
                <option value={10}>10 minutes</option>
                <option value={15}>15 minutes (Standard Practice)</option>
                <option value={30}>30 minutes</option>
                <option value={60}>60 minutes (1 hour)</option>
              </select>
              <p className="text-[10px] text-ink-soft">
                Time without user input before automatic logout triggers.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-ink">
                Warning Countdown (seconds)
              </label>
              <select
                disabled={!enabled}
                value={warningSeconds}
                onChange={(e) => setWarningSeconds(Number(e.target.value))}
                className="w-full rounded-lg border border-line bg-bone px-3 py-2 text-xs text-ink focus:outline-none focus:ring-1 focus:ring-forest disabled:opacity-50"
              >
                <option value={15}>15 seconds</option>
                <option value={30}>30 seconds</option>
                <option value={60}>60 seconds (1 minute)</option>
                <option value={120}>120 seconds (2 minutes)</option>
              </select>
              <p className="text-[10px] text-ink-soft">
                Duration of the visible countdown modal before session closes.
              </p>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <Button type="submit" variant="primary" size="sm" disabled={isSaving}>
              {isSaving ? "Saving Settings..." : "Save Inactivity Preferences"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  </AnimatedPage>
  );
}
