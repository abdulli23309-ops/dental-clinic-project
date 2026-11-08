"use client";

import React, { useState, useId } from "react";
import { Check, Copy, Eye, EyeOff, Lock, Sparkles } from "lucide-react";

export interface PasswordFieldProps {
  value: string;
  onChange: (value: string) => void;
  id?: string;
  name?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  label?: string;
  className?: string;
  showStrengthMeter?: boolean;
  showGenerator?: boolean;
}

export function PasswordField({
  value,
  onChange,
  id,
  name = "password",
  placeholder = "Enter secure password",
  required = false,
  disabled = false,
  label = "Account Password",
  className = "",
  showStrengthMeter = true,
  showGenerator = true,
}: PasswordFieldProps) {
  const generatedId = useId();
  const inputId = id || generatedId;
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState(false);

  // Requirement checks matching backend policy (min 8 chars, 1 uppercase, 1 lowercase, 1 digit)
  const hasMinLength = value.length >= 8;
  const hasUppercase = /[A-Z]/.test(value);
  const hasLowercase = /[a-z]/.test(value);
  const hasNumber = /[0-9]/.test(value);
  const hasSpecial = /[^A-Za-z0-9]/.test(value);

  const checks = [
    { label: "8 characters", met: hasMinLength },
    { label: "1 lowercase", met: hasLowercase },
    { label: "1 special character", met: hasSpecial },
    { label: "1 uppercase", met: hasUppercase },
    { label: "1 number", met: hasNumber },
  ];

  const metCount = checks.filter((c) => c.met).length;

  // Strength score: Red / Yellow / Green progression
  let strengthLabel = "Weak";
  let strengthColor = "bg-red-500";
  let strengthWidth = "25%";

  if (metCount >= 4) {
    strengthLabel = "Strong";
    strengthColor = "bg-emerald-500";
    strengthWidth = "100%";
  } else if (metCount >= 2) {
    strengthLabel = "Medium";
    strengthColor = "bg-amber-400";
    strengthWidth = "60%";
  } else {
    strengthLabel = "Weak";
    strengthColor = "bg-red-500";
    strengthWidth = "25%";
  }

  const generatePassword = () => {
    const uppers = "ABCDEFGHJKLMNPQRSTUVWXYZ";
    const lowers = "abcdefghijkmnopqrstuvwxyz";
    const digits = "23456789";
    const specials = "!@#$%^&*";
    const all = uppers + lowers + digits + specials;

    // Guaranteed one of each
    let pwd = "";
    pwd += uppers[Math.floor(Math.random() * uppers.length)];
    pwd += lowers[Math.floor(Math.random() * lowers.length)];
    pwd += digits[Math.floor(Math.random() * digits.length)];
    pwd += specials[Math.floor(Math.random() * specials.length)];

    for (let i = 0; i < 8; i++) {
      pwd += all[Math.floor(Math.random() * all.length)];
    }

    // Shuffle characters
    const shuffled = pwd
      .split("")
      .sort(() => Math.random() - 0.5)
      .join("");

    onChange(shuffled);
  };

  const copyToClipboard = async () => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center justify-between">
        <label htmlFor={inputId} className="text-xs font-bold text-foreground">
          {label} {required && <span className="text-destructive">*</span>}
        </label>
        {showGenerator && (
          <button
            type="button"
            onClick={generatePassword}
            disabled={disabled}
            className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Generate Strong Password
          </button>
        )}
      </div>

      {/* Input container */}
      <div className="relative flex items-center">
        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <input
          id={inputId}
          name={name}
          type={showPassword ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          autoComplete="new-password"
          className="w-full pl-10 pr-20 py-2.5 text-sm font-mono rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
        />

        <div className="absolute right-2 flex items-center gap-1 text-muted-foreground">
          {value && (
            <button
              type="button"
              onClick={copyToClipboard}
              title={copied ? "Copied!" : "Copy password"}
              className="p-1.5 rounded-lg hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
              aria-label="Copy password"
            >
              {copied ? (
                <Check className="w-4 h-4 text-emerald-600" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            title={showPassword ? "Hide password" : "Show password"}
            className="p-1.5 rounded-lg hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? (
              <EyeOff className="w-4 h-4" />
            ) : (
              <Eye className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Strength meter & checklist */}
      {showStrengthMeter && value.length > 0 && (
        <div className="space-y-2 pt-1 animate-in fade-in duration-200">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-muted-foreground">Strength</span>
            <span className="font-semibold text-foreground">{strengthLabel}</span>
          </div>

          <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 rounded-full ${strengthColor}`}
              style={{ width: strengthWidth }}
            />
          </div>

          <div className="grid grid-cols-2 gap-1.5 pt-1 text-[11px]">
            {checks.map((c, i) => (
              <div
                key={i}
                className={`flex items-center gap-1.5 ${c.met ? "text-emerald-600 dark:text-emerald-400 font-medium" : "text-muted-foreground"
                  }`}
              >
                <span
                  className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] shrink-0 ${c.met ? "bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300" : "bg-muted text-muted-foreground"
                    }`}
                >
                  {c.met ? "✓" : "•"}
                </span>
                <span>{c.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

