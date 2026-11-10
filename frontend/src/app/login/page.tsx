"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CalendarCheck2,
  CheckCircle2,
  Lock,
  ShieldCheck,
  Stethoscope,
} from "lucide-react";

import { useAuth } from "@/components/providers/auth-provider";
import { homePathForRole } from "@/lib/workspace";
import { fetchPublicOrganization, Organization } from "@/lib/api";
import { useClinicBranding } from "@/components/ui/clinic-logo";
import { ThemeToggle } from "@/components/ui/theme-toggle";

export default function LoginPage() {
  const router = useRouter();
  const { user, login, isLoading, logout } = useAuth();
  const {
    logoUrl,
    fullBrandName,
    shortBrandName,
    tagline: clinicTagline,
    phone: clinicPhone,
    primaryColor: brandPrimaryColor,
    secondaryColor: brandSecondaryColor,
  } = useClinicBranding();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  // Dynamic Organization & Theming
  const [org, setOrg] = useState<Organization | null>(null);
  useEffect(() => {
    fetchPublicOrganization()
      .then((data) => {
        if (data) setOrg(data);
      })
      .catch(() => {});
  }, []);

  // Handle URL reason params
  useEffect(() => {
    queueMicrotask(() => {
      const reason = new URLSearchParams(window.location.search).get("reason");
      if (reason === "session_expired") {
        setInfoMessage("Your session expired. Please sign in again.");
      } else if (reason === "inactivity") {
        setInfoMessage("You were signed out after a period of inactivity.");
      } else if (reason === "no-workspace") {
        setInfoMessage("This account does not have a staff workspace. Contact your administrator.");
      }
    });
  }, []);

  // Redirect if already logged in with valid workspace
  useEffect(() => {
    if (!isLoading && user) {
      const homePath = homePathForRole(user.role);
      if (homePath) {
        router.replace(homePath);
      }
    }
  }, [user, isLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email.trim() || !password) {
      setErrorMessage("Please enter both email and password.");
      return;
    }

    setIsSubmitting(true);
    try {
      await login(email.trim(), password);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Invalid credentials. Please verify your email and password.";
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const primaryColor = brandPrimaryColor || org?.primaryColor || "#1F3D34";
  const orgName = fullBrandName || org?.displayName || org?.name || "Hira Dental Clinic";
  const orgTagline = clinicTagline || org?.tagline || "Comprehensive, Unhurried Dental Care";

  return (
    <div className="min-h-screen w-full grid grid-cols-1 lg:grid-cols-2 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 overflow-hidden font-sans">
      {/* LEFT PANEL: Responsive Enterprise Showcase with High-Contrast Typography & Floating Cards */}
      <div className="relative hidden lg:flex flex-col justify-between p-12 xl:p-16 bg-gradient-to-br from-slate-100 via-slate-50 to-primary/[0.04] dark:from-slate-900 dark:via-slate-950 dark:to-primary/[0.08] border-r border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Soft Decorative Ambient Background */}
        <div 
          className="absolute -top-24 -left-24 w-96 h-96 rounded-full blur-3xl pointer-events-none opacity-20 dark:opacity-10"
          style={{ backgroundColor: primaryColor }}
        />
        <div 
          className="absolute -bottom-24 -right-24 w-96 h-96 rounded-full blur-3xl pointer-events-none opacity-15 dark:opacity-10"
          style={{ backgroundColor: primaryColor }}
        />

        {/* Top Branding Pill */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs flex items-center justify-center p-1.5 overflow-hidden shrink-0">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoUrl}
                alt={orgName}
                className="w-full h-full object-contain"
              />
            ) : (
              <span className="font-display font-bold text-xl text-primary" style={{ color: primaryColor }}>
                {shortBrandName.charAt(0) || "H"}
              </span>
            )}
          </div>
          <div className="min-w-0">
            <span className="font-display font-bold text-base tracking-tight text-slate-900 dark:text-white block leading-tight truncate">
              {orgName}
            </span>
            <span className="block text-[11px] font-medium tracking-wide text-slate-500 dark:text-slate-400 mt-0.5 truncate">
              {orgTagline}
            </span>
          </div>
        </div>

        {/* Floating Enterprise Metric Cards */}
        <div className="relative z-10 my-auto py-10 flex flex-col items-center justify-center space-y-5 w-full max-w-md mx-auto">
          {/* Card 1: Daily Schedule & Turnaround */}
          <motion.div
            initial={{ y: 0 }}
            animate={{ y: [-5, 5, -5] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
            suppressHydrationWarning
            className="w-full bg-white dark:bg-slate-900/95 border border-slate-200 dark:border-slate-800 shadow-md dark:shadow-2xl rounded-2xl p-4 sm:p-5 backdrop-blur-xs"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3.5">
                <div 
                  className="w-11 h-11 rounded-xl flex items-center justify-center font-bold"
                  style={{ backgroundColor: `${primaryColor}15`, color: primaryColor }}
                >
                  <CalendarCheck2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-slate-900 dark:text-white text-sm">Daily Schedule</h4>
                    <span 
                      className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                      style={{ backgroundColor: `${primaryColor}18`, color: primaryColor }}
                    >
                      Live
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
                    98.4% on-time chair turnaround
                  </p>
                </div>
              </div>
              <span className="text-xl font-display font-bold" style={{ color: primaryColor }}>
                24/7
              </span>
            </div>
          </motion.div>

          {/* Card 2: Secure Staff Portal & Desk */}
          <motion.div
            initial={{ y: 0 }}
            animate={{ y: [5, -5, 5] }}
            transition={{ duration: 5.6, repeat: Infinity, ease: "easeInOut", delay: 0.3 }}
            suppressHydrationWarning
            className="w-11/12 ml-auto bg-white dark:bg-slate-900/95 border border-slate-200 dark:border-slate-800 shadow-md dark:shadow-2xl rounded-2xl p-4 backdrop-blur-xs"
          >
            <div className="flex items-center gap-3.5">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0"
                style={{ backgroundColor: `${primaryColor}15`, color: primaryColor }}
              >
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-900 dark:text-white text-sm truncate">
                    {shortBrandName || "DHDC"} Staff Portal
                  </h4>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="Active Connection" />
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5 font-medium">
                  {clinicPhone ? `Direct Desk: ${clinicPhone}` : "Encrypted Clinical Workspace"}
                </p>
              </div>
            </div>
          </motion.div>

          {/* Card 3: Multi-Location Coordination Badge */}
          <motion.div
            initial={{ y: 0 }}
            animate={{ y: [-4, 4, -4] }}
            transition={{ duration: 4.8, repeat: Infinity, ease: "easeInOut", delay: 0.6 }}
            suppressHydrationWarning
            className="w-10/12 mr-auto bg-white dark:bg-slate-900/95 border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-xl rounded-xl p-3.5 backdrop-blur-xs"
          >
            <div className="flex items-center gap-3 text-xs text-slate-700 dark:text-slate-300">
              <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0">
                <Building2 className="w-4 h-4" />
              </div>
              <span className="font-semibold truncate">Active Clinical Branches Connected</span>
              <CheckCircle2 className="w-4 h-4 text-primary ml-auto shrink-0" />
            </div>
          </motion.div>
        </div>

        {/* Bottom Headline & Clear High-Contrast Text (Never Blurry) */}
        <div className="relative z-10 space-y-2.5">
          <h2 className="font-display text-2xl xl:text-3xl font-bold leading-tight text-slate-900 dark:text-white tracking-tight">
            Effortlessly manage your clinics, team, and patients in one place.
          </h2>
          <p className="text-xs xl:text-sm text-slate-600 dark:text-slate-400 max-w-md leading-relaxed font-normal">
            Enterprise clinical administration with real-time chair scheduling, doctor procedure overrides, and multi-branch catalog coordination.
          </p>
        </div>
      </div>

      {/* RIGHT PANEL: Adaptive Light / Dark Card Login Form */}
      <div className="flex flex-col justify-between p-6 sm:p-12 lg:p-16 xl:p-20 bg-white dark:bg-slate-950 transition-colors">
        {/* Top Bar Navigation */}
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to public website</span>
          </Link>
          <div className="flex items-center gap-2.5">
            <ThemeToggle />
            <span className="text-[11px] font-mono uppercase tracking-wider text-primary font-bold px-3 py-1 rounded-full bg-primary/10 border border-primary/20">
              Staff Portal
            </span>
          </div>
        </div>

        {/* Center Login Form Container */}
        <div className="w-full max-w-md mx-auto my-auto py-8">
          <div className="space-y-6">
            {/* Header */}
            <div className="space-y-1.5">
              <h1 className="font-display text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                Welcome back
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Sign in with your clinical credentials to access your administrative workspace.
              </p>
            </div>

            {/* Info Message Notice */}
            {infoMessage && !errorMessage && (
              <div className="rounded-2xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 p-3.5 text-xs text-amber-900 dark:text-amber-200 font-medium">
                {infoMessage}
              </div>
            )}

            {/* User Signed In Without Workspace Alert */}
            {!isLoading && user && !homePathForRole(user.role) && (
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-4 text-xs text-slate-700 dark:text-slate-300 space-y-3">
                <p>
                  Signed in as <strong className="text-slate-900 dark:text-white">{user.email}</strong> with role{" "}
                  <strong className="text-slate-900 dark:text-white">{user.role}</strong>. There is no staff
                  workspace assigned to this role.
                </p>
                <button
                  type="button"
                  onClick={() => logout()}
                  className="px-4 py-1.5 rounded-full bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-semibold transition-colors cursor-pointer"
                >
                  Sign out
                </button>
              </div>
            )}

            {/* Error Message Notice */}
            {errorMessage && (
              <div className="rounded-2xl border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 p-4 text-xs text-rose-900 dark:text-rose-200 font-medium">
                {errorMessage}
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email Field */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@hiradental.com"
                  autoComplete="email"
                  className="w-full px-4 py-3 text-sm rounded-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 outline-none focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />
              </div>

              {/* Password Field with Left Padlock and Right Show/Hide Toggle */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                  Password
                </label>
                <div className="relative flex items-center">
                  <Lock className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-4 pointer-events-none" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    autoComplete="current-password"
                    className="w-full pl-11 pr-16 py-3 text-sm rounded-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 outline-none focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors p-1 cursor-pointer"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 px-6 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2 shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
                >
                  <span>{isSubmitting ? "Signing in..." : "Log in"}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>

            {/* Security Assurance Badge */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-900 flex items-center justify-center gap-2 text-[11px] text-slate-400 dark:text-slate-500">
              <ShieldCheck className="w-3.5 h-3.5 text-primary" />
              <span>Session protected with JWT and HttpOnly token rotation</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-slate-400 dark:text-slate-500">
          {orgName} · Clinical Management System
        </div>
      </div>
    </div>
  );
}
