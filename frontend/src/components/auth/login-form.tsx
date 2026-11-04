"use client";

import React, { useState } from "react";
import { motion } from "motion/react";
import { ArrowRight, Eye, EyeOff, Lock, ShieldCheck } from "lucide-react";

export interface LoginFormProps {
  onSubmit: (email: string, password: string) => Promise<void>;
  isSubmitting?: boolean;
  errorMessage?: string | null;
  onEmailChange?: (email: string) => void;
  initialEmail?: string;
}

export function LoginForm({
  onSubmit,
  isSubmitting = false,
  errorMessage = null,
  onEmailChange,
  initialEmail = "",
}: LoginFormProps) {
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleEmailChange = (val: string) => {
    setEmail(val);
    onEmailChange?.(val);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;
    onSubmit(email.trim(), password);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {errorMessage && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50/90 dark:border-rose-900/40 dark:bg-rose-950/30 p-4 text-xs text-rose-800 dark:text-rose-300">
          {errorMessage}
        </div>
      )}

      {/* Email Field */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
          Email Address
        </label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => handleEmailChange(e.target.value)}
          placeholder="admin@hiradental.com"
          autoComplete="email"
          className="w-full px-4 py-3.5 text-sm rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:ring-2 focus:ring-[#1F3D34]/20 focus:border-[#1F3D34] dark:focus:border-emerald-500 transition-all font-mono"
        />
      </div>

      {/* Enhanced Password Field: Padlock inside left, Show/Hide toggle on right */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
          Password
        </label>
        <div className="relative flex items-center">
          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500 pointer-events-none" />
          <input
            type={showPassword ? "text" : "password"}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••••••"
            autoComplete="current-password"
            className="w-full pl-11 pr-11 py-3.5 text-sm rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:ring-2 focus:ring-[#1F3D34]/20 focus:border-[#1F3D34] dark:focus:border-emerald-500 transition-all font-mono"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-1 cursor-pointer"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Global Button Press: Sink & Spring */}
      <div className="pt-2">
        <motion.button
          type="submit"
          disabled={isSubmitting}
          whileTap={{ scale: 0.95 }}
          whileHover={{ scale: 1.01 }}
          transition={{ type: "spring", stiffness: 500, damping: 25 }}
          className="w-full py-3.5 px-6 rounded-full bg-slate-900 hover:bg-black text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 font-semibold text-sm flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
        >
          <span>{isSubmitting ? "Signing in..." : "Log in"}</span>
          <ArrowRight className="w-4 h-4" />
        </motion.button>
      </div>

      <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-center gap-2 text-[11px] text-slate-400 dark:text-slate-500">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
        <span>Session protected with JWT and HttpOnly token rotation</span>
      </div>
    </form>
  );
}

