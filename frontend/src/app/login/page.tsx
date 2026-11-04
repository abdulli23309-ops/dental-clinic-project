"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CalendarCheck2,
  CheckCircle2,
  Eye,
  EyeOff,
  Lock,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  User,
  Users,
} from "lucide-react";

import { useAuth } from "@/components/providers/auth-provider";
import { homePathForRole } from "@/lib/workspace";
import { fetchPublicOrganization, Organization, resolveMediaUrl } from "@/lib/api";
import { useClinicBranding, ClinicLogo } from "@/components/ui/clinic-logo";

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
  // 1. Fetch Organization Branding on Mount
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
  const secondaryColor = brandSecondaryColor || org?.secondaryColor || "#B8935A";
  const orgName = fullBrandName || org?.displayName || org?.name || "Hira Dental Clinic";
  const orgTagline = clinicTagline || org?.tagline || "Clinical Management Suite";

  return (
    <div className="min-h-screen w-full grid grid-cols-1 lg:grid-cols-2 bg-white dark:bg-[#0c0d0e] text-slate-900 dark:text-slate-100 overflow-hidden">
      {/* LEFT PANEL: Dynamic Theme Soft Gradient with 3D Glassmorphic Floating Cards & Typography */}
      <div 
        className="relative hidden lg:flex flex-col justify-between p-12 xl:p-16 border-r border-slate-200/50 dark:border-white/5 overflow-hidden transition-colors duration-500"
        style={{
          background: `linear-gradient(135deg, ${primaryColor}22 0%, #FFFFFF 50%, ${secondaryColor}18 100%)`,
        }}
      >
        {/* Soft Decorative Ambient Glows using Dynamic Theme Colors */}
        <div 
          className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full blur-3xl pointer-events-none opacity-40 transition-colors duration-500"
          style={{ backgroundColor: primaryColor }}
        />
        <div 
          className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full blur-3xl pointer-events-none opacity-30 transition-colors duration-500"
          style={{ backgroundColor: secondaryColor }}
        />

        {/* Top Branding Pill - Dynamic Organization Branding with Real Uploaded Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-white/90 dark:bg-white/10 backdrop-blur-md border border-white/60 dark:border-white/10 shadow-xs flex items-center justify-center p-1 overflow-hidden shrink-0">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoUrl}
                alt={orgName}
                className="w-full h-full object-contain"
              />
            ) : (
              <span className="font-display font-bold text-lg text-primary" style={{ color: primaryColor }}>
                {shortBrandName.charAt(0)}
              </span>
            )}
          </div>
          <div className="min-w-0">
            <span className="font-display font-bold text-base tracking-tight text-slate-900 dark:text-white block leading-tight truncate">
              {orgName}
            </span>
            <span className="block text-[10px] font-mono uppercase tracking-wider text-slate-600 dark:text-slate-400 mt-0.5 truncate">
              {orgTagline}
            </span>
          </div>
        </div>

        {/* Floating 3D Glassmorphic Cards Container */}
        <div className="relative z-10 my-auto py-12 flex flex-col items-center justify-center space-y-6 w-full max-w-lg mx-auto">
          {/* Floating Card 1: Daily On-Time Consultations */}
          <motion.div
            animate={{ y: [-8, 8, -8] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
            className="w-full backdrop-blur-xl bg-white/60 dark:bg-white/10 border border-white/80 dark:border-white/20 shadow-xl rounded-3xl p-5 hover:shadow-2xl transition-all"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3.5">
                <div 
                  className="w-12 h-12 rounded-2xl flex items-center justify-center font-bold"
                  style={{ backgroundColor: `${primaryColor}15`, color: primaryColor }}
                >
                  <CalendarCheck2 className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-slate-900 dark:text-white text-base">Daily Schedule</h4>
                    <span 
                      className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                      style={{ backgroundColor: `${primaryColor}20`, color: primaryColor }}
                    >
                      Live
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                    98.4% on-time chair turnaround
                  </p>
                </div>
              </div>
              <span className="text-2xl font-display font-bold" style={{ color: primaryColor }}>24/7</span>
            </div>
          </motion.div>

          {/* Floating Card 2: Secure Clinical Workspace & Real-time Operations */}
          <motion.div
            animate={{ y: [8, -8, 8] }}
            transition={{ duration: 5.6, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
            className="w-11/12 ml-auto backdrop-blur-xl bg-white/70 dark:bg-white/15 border border-white/80 dark:border-white/20 shadow-xl rounded-3xl p-4 hover:shadow-2xl transition-all"
          >
            <div className="flex items-center gap-3.5">
              <div
                className="w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-sm shrink-0"
                style={{ backgroundColor: `${primaryColor}18`, color: primaryColor }}
              >
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-900 dark:text-white text-sm truncate">
                    {shortBrandName} Portal
                  </h4>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="Secure Clinical Network" />
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 truncate mt-0.5">
                  {clinicPhone ? `Direct Desk: ${clinicPhone}` : "Encrypted Staff Workspace"}
                </p>
              </div>
            </div>
          </motion.div>

          {/* Floating Card 3: Multi-Location Coordination Badge */}
          <motion.div
            animate={{ y: [-6, 6, -6] }}
            transition={{ duration: 4.8, repeat: Infinity, ease: "easeInOut", delay: 0.8 }}
            className="w-10/12 mr-auto backdrop-blur-xl bg-white/60 dark:bg-white/10 border border-white/80 dark:border-white/20 shadow-lg rounded-2xl p-3.5"
          >
            <div className="flex items-center gap-3 text-xs text-slate-700 dark:text-slate-200">
              <div 
                className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                style={{ backgroundColor: `${secondaryColor}25`, color: secondaryColor }}
              >
                <Building2 className="w-4 h-4" />
              </div>
              <span className="font-medium truncate">4 Active Clinical Branches Connected</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 ml-auto shrink-0" />
            </div>
          </motion.div>
        </div>

        {/* Bottom Headline & Editorial Typography */}
        <div className="relative z-10 space-y-3">
          <h2 className="font-display text-3xl xl:text-4xl font-normal leading-tight text-slate-900 dark:text-white">
            Effortlessly manage your clinics, team and patients in one place.
          </h2>
          <p className="text-xs xl:text-sm text-slate-600 dark:text-slate-400 max-w-md leading-relaxed">
            Enterprise clinical administration with real-time chair scheduling, doctor procedure overrides, and multi-branch catalog coordination.
          </p>
        </div>
      </div>

      {/* RIGHT PANEL: Pristine White Login Form */}
      <div className="flex flex-col justify-between p-6 sm:p-12 lg:p-16 xl:p-20 bg-white dark:bg-[#0c0d0e]">
        {/* Top Bar Navigation */}
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to public website</span>
          </Link>
          <span className="text-[11px] font-mono uppercase tracking-wider text-emerald-700 dark:text-emerald-400 font-semibold px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50">
            Staff Portal
          </span>
        </div>

        {/* Center Login Form Container */}
        <div className="w-full max-w-md mx-auto my-auto py-10">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="space-y-6"
          >
            {/* Header */}
            <div className="space-y-2">
              <h1 className="font-serif text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                Welcome back
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Sign in with your clinical credentials to access your administrative workspace.
              </p>
            </div>

            {/* Info Message Notice */}
            {infoMessage && !errorMessage && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="rounded-2xl border border-amber-200 bg-amber-50/80 dark:border-amber-900/40 dark:bg-amber-950/30 p-3.5 text-xs text-amber-800 dark:text-amber-300"
              >
                {infoMessage}
              </motion.div>
            )}

            {/* User Signed In Without Workspace Alert */}
            {!isLoading && user && !homePathForRole(user.role) && (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/60 p-4 text-xs text-slate-700 dark:text-slate-300 space-y-3">
                <p>
                  Signed in as <strong className="text-slate-900 dark:text-white">{user.email}</strong> with role{" "}
                  <strong className="text-slate-900 dark:text-white">{user.role}</strong>. There is no staff
                  workspace assigned to this role.
                </p>
                <button
                  onClick={() => logout()}
                  className="px-3 py-1.5 rounded-full bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 text-slate-900 dark:text-white font-semibold transition-colors"
                >
                  Sign out
                </button>
              </div>
            )}

            {/* Error Message Notice */}
            {errorMessage && (
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="rounded-2xl border border-rose-200 bg-rose-50/90 dark:border-rose-900/40 dark:bg-rose-950/30 p-4 text-xs text-rose-800 dark:text-rose-300"
              >
                {errorMessage}
              </motion.div>
            )}

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email Field */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@hiradental.com"
                  autoComplete="email"
                  className="w-full px-4 py-3.5 text-sm rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:ring-2 focus:ring-[#1F3D34]/20 focus:border-[#1F3D34] dark:focus:border-emerald-500 transition-all"
                />
              </div>

              {/* Password Field with Visual Padlock Anchor and Show/Hide Text Toggle */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Password
                  </label>
                </div>
                <div className="relative flex items-center">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-4 pointer-events-none" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    autoComplete="current-password"
                    className="w-full pl-11 pr-16 py-3.5 text-sm rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:ring-2 focus:ring-[#1F3D34]/20 focus:border-[#1F3D34] dark:focus:border-emerald-500 transition-all font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors p-1 cursor-pointer"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </div>

              {/* Submit Button with Sink & Spring Interaction */}
              <div className="pt-2">
                <motion.button
                  type="submit"
                  disabled={isSubmitting}
                  whileTap={{ scale: 0.95 }}
                  transition={{ type: "spring", stiffness: 400, damping: 17 }}
                  className="w-full py-3.5 px-6 rounded-full bg-slate-900 hover:bg-black text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 font-semibold text-sm flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
                >
                  <span>{isSubmitting ? "Signing in..." : "Log in"}</span>
                  <ArrowRight className="w-4 h-4" />
                </motion.button>
              </div>
            </form>

            {/* Security Assurance Badge */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-center gap-2 text-[11px] text-slate-400 dark:text-slate-500">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Session protected with JWT and HttpOnly token rotation</span>
            </div>
          </motion.div>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-slate-400 dark:text-slate-600">
          {orgName} · Clinical Management System
        </div>
      </div>
    </div>
  );
}
