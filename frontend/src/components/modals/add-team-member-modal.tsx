"use client";

import React, { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  AlertTriangle,
  Building2,
  Check,
  ChevronDown,
  Eye,
  EyeOff,
  GraduationCap,
  ImagePlus,
  Lock,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Trash2,
  Upload,
  UserCheck,
  UserPlus,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { TeamMember } from "@/lib/api";

export interface AddTeamMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    fullName: string;
    email: string;
    role: string;
    password: string;
    teamMemberId?: string;
    photoUrl?: string;
    degree?: string;
    specialties?: string;
  }) => Promise<void>;
  unlinkedTeamMembers?: TeamMember[];
  isSubmitting?: boolean;
}

const ROLES = [
  { value: "doctor", label: "Doctor", icon: Stethoscope },
  { value: "nurse", label: "Nurse", icon: UserCheck },
  { value: "admin", label: "Admin", icon: ShieldCheck },
  { value: "receptionist", label: "Receptionist", icon: Sparkles },
];

export function AddTeamMemberModal({
  isOpen,
  onClose,
  onSubmit,
  unlinkedTeamMembers = [],
  isSubmitting = false,
}: AddTeamMemberModalProps) {
  const [role, setRole] = useState("doctor");
  const [teamMemberId, setTeamMemberId] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [isEmailLocked, setIsEmailLocked] = useState(false);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [degree, setDegree] = useState("");
  const [specialties, setSpecialties] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPractitionerDropdownOpen, setIsPractitionerDropdownOpen] = useState(false);

  // Real-time requirements checklist & strength meter
  const reqMinLength = password.length >= 8;
  const reqUpperLower = /[A-Z]/.test(password) && /[a-z]/.test(password);
  const reqDigitOrSpecial = /[0-9]/.test(password) || /[^A-Za-z0-9]/.test(password);

  const reqMetCount =
    (reqMinLength ? 1 : 0) + (reqUpperLower ? 1 : 0) + (reqDigitOrSpecial ? 1 : 0);

  let strengthLabel = "Weak";
  let strengthColor = "bg-rose-500";
  let strengthWidth = "33%";
  let strengthTextColor = "text-rose-600";

  if (reqMetCount === 3 && reqMinLength) {
    strengthLabel = "Strong";
    strengthColor = "bg-emerald-500";
    strengthWidth = "100%";
    strengthTextColor = "text-emerald-600";
  } else if (reqMetCount >= 2) {
    strengthLabel = "Fair";
    strengthColor = "bg-amber-400";
    strengthWidth = "66%";
    strengthTextColor = "text-amber-600";
  } else {
    strengthLabel = "Weak";
    strengthColor = "bg-rose-500";
    strengthWidth = password.length > 0 ? "33%" : "0%";
    strengthTextColor = "text-rose-600";
  }

  const generatePassword = () => {
    const uppers = "ABCDEFGHJKLMNPQRSTUVWXYZ";
    const lowers = "abcdefghijkmnopqrstuvwxyz";
    const digits = "23456789";
    const specials = "!@#$%^&*";
    const all = uppers + lowers + digits + specials;

    let pwd = "";
    pwd += uppers[Math.floor(Math.random() * uppers.length)];
    pwd += lowers[Math.floor(Math.random() * lowers.length)];
    pwd += digits[Math.floor(Math.random() * digits.length)];
    pwd += specials[Math.floor(Math.random() * specials.length)];

    for (let i = 0; i < 8; i++) {
      pwd += all[Math.floor(Math.random() * all.length)];
    }

    const shuffled = pwd
      .split("")
      .sort(() => Math.random() - 0.5)
      .join("");

    setPassword(shuffled);
    if (error) setError(null);
  };

  if (!isOpen) return null;

  const handleSelectPractitioner = (id: string) => {
    setTeamMemberId(id);
    setIsPractitionerDropdownOpen(false);
    if (!id) {
      setIsEmailLocked(false);
      return;
    }
    const tm = unlinkedTeamMembers.find((t) => t.id === id);
    if (tm) {
      setFullName(tm.displayName || `${tm.firstName} ${tm.lastName}`.trim());
      const cleanFirst = tm.firstName.toLowerCase().replace(/[^a-z0-9]/g, "");
      const cleanLast = tm.lastName.toLowerCase().replace(/[^a-z0-9]/g, "");
      setEmail(`${cleanFirst}.${cleanLast}@hiradental.com`);
      setIsEmailLocked(true);
      if (tm.credentials) setDegree(tm.credentials);
      if (Array.isArray(tm.specialties) && tm.specialties.length > 0) {
        setSpecialties(tm.specialties.join(", "));
      }
      if (tm.photoUrl) setPhotoPreview(tm.photoUrl);
    }
  };

  const selectedPractitioner = unlinkedTeamMembers.find((t) => t.id === teamMemberId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!password) {
      setError("Password is required.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }
    if (!/[A-Z]/.test(password) || !/[a-z]/.test(password)) {
      setError("Password must contain both uppercase and lowercase letters.");
      return;
    }
    if (!/[0-9]/.test(password)) {
      setError("Password must contain at least one digit.");
      return;
    }

    try {
      await onSubmit({
        fullName,
        email,
        role,
        password,
        teamMemberId: role === "doctor" && teamMemberId ? teamMemberId : undefined,
        photoUrl: photoPreview || undefined,
        degree: role === "doctor" || role === "nurse" ? degree : undefined,
        specialties: role === "doctor" || role === "nurse" ? specialties : undefined,
      });
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create team member account.");
    }
  };

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-team-title"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 10 }}
          transition={{ duration: 0.2 }}
          className="bg-white rounded-2xl border border-slate-200/90 shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto p-6 sm:p-7 space-y-5 my-auto"
        >
          {/* Header */}
          <div className="flex items-start justify-between pb-3.5 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
                <UserPlus className="h-5 w-5" />
              </div>
              <div>
                <h3 id="add-team-title" className="font-bold text-slate-900 text-base tracking-tight">
                  Create New Staff / Team Member
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Set up role permissions, practitioner profile linkage, and access credentials.
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              aria-label="Close modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {error && (
            <div className="p-3 bg-rose-50 text-rose-700 text-xs rounded-xl border border-rose-200 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <div className="flex-1 leading-snug">{error}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5 text-xs">
            {/* AVATAR UPLOAD: Modern Drag-and-Drop / Picker Zone */}
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-700 block">Staff Avatar / Photo</label>
              <div
                onClick={() => document.getElementById("add-member-photo-input")?.click()}
                className="flex items-center gap-4 p-3.5 bg-slate-50 hover:bg-slate-100/70 border border-dashed border-slate-300 hover:border-primary/60 rounded-xl transition-all cursor-pointer group"
              >
                <div className="w-14 h-14 rounded-xl overflow-hidden bg-white border border-slate-200 flex items-center justify-center relative shrink-0 shadow-xs">
                  {photoPreview ? (
                    <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <ImagePlus className="w-6 h-6 text-slate-400 group-hover:text-primary transition-colors" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-slate-800 group-hover:text-primary transition-colors">
                      {photoPreview ? "Photo selected (click to replace)" : "Click to upload image or drag and drop"}
                    </p>
                    {photoPreview && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPhotoPreview(null);
                        }}
                        className="text-[11px] font-medium text-rose-600 hover:text-rose-700 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                        Remove
                      </button>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    PNG, JPG or WebP up to 5MB. Recommended square aspect ratio.
                  </p>
                </div>
                <input
                  id="add-member-photo-input"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = (ev) => {
                        setPhotoPreview(ev.target?.result as string);
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                />
              </div>
            </div>

            {/* SYSTEM ROLE SELECTION: Modern Segmented Controls / Interactive Pills */}
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-700 block">
                System Role <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {ROLES.map((r) => {
                  const isSelected = role === r.value;
                  const Icon = r.icon;
                  return (
                    <button
                      key={r.value}
                      type="button"
                      onClick={() => {
                        setRole(r.value);
                        if (r.value !== "doctor") {
                          setTeamMemberId("");
                          setIsEmailLocked(false);
                        }
                      }}
                      className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer select-none ${
                        isSelected
                          ? "bg-primary text-white border-primary shadow-xs ring-2 ring-primary/20"
                          : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-slate-300"
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5 shrink-0" />
                      <span>{r.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* BASIC INFO: Two-column layout */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-700 block">
                  Staff Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dr. Hira Babar"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-xs bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-medium"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-slate-700 block">
                    Institutional Email <span className="text-rose-500">*</span>
                  </label>
                  {isEmailLocked && (
                    <span className="text-[10px] font-semibold text-emerald-600 flex items-center gap-1">
                      <Lock className="w-3 h-3" /> Linked to practitioner
                    </span>
                  )}
                </div>
                <div className="relative">
                  <input
                    type="email"
                    required
                    readOnly={isEmailLocked}
                    placeholder="e.g. dr.hira.babar@hiradental.com"
                    value={email}
                    onChange={(e) => !isEmailLocked && setEmail(e.target.value)}
                    className={`w-full px-3.5 py-2.5 border rounded-lg text-xs font-mono transition-all focus:outline-none ${
                      isEmailLocked
                        ? "border-slate-200 bg-slate-100/80 text-slate-500 cursor-not-allowed pr-8"
                        : "border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    }`}
                  />
                  {isEmailLocked && (
                    <Lock className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-3 pointer-events-none" />
                  )}
                </div>
              </div>
            </div>

            {/* CLINICAL CREDENTIALS CARD (Doctor / Nurse) */}
            {(role === "doctor" || role === "nurse") && (
              <div className="bg-slate-50 border border-slate-200/90 rounded-xl p-4 space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                    <GraduationCap className="w-4 h-4 text-primary" />
                    <span>Clinical Credentials & Profile Link</span>
                  </div>
                  {role === "doctor" && unlinkedTeamMembers.length > 0 && (
                    <span className="text-[10px] font-mono text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded-full">
                      {unlinkedTeamMembers.length} available to link
                    </span>
                  )}
                </div>

                {/* Custom Practitioner Selector for Doctors */}
                {role === "doctor" && unlinkedTeamMembers.length > 0 && (
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-slate-700 block">
                      Link to Clinical Team Member
                    </label>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setIsPractitionerDropdownOpen(!isPractitionerDropdownOpen)}
                        className="w-full flex items-center justify-between px-3.5 py-2.5 border border-slate-200 rounded-lg text-xs bg-white text-slate-900 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-left cursor-pointer"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <Stethoscope className="w-3.5 h-3.5 text-primary shrink-0" />
                          <span className="truncate font-medium">
                            {selectedPractitioner
                              ? `${selectedPractitioner.displayName || `${selectedPractitioner.firstName} ${selectedPractitioner.lastName}`} (${selectedPractitioner.professionalTitle || selectedPractitioner.role || "Practitioner"})`
                              : "-- Choose Doctor from Clinical Team (Optional) --"}
                          </span>
                        </div>
                        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isPractitionerDropdownOpen ? "rotate-180" : ""}`} />
                      </button>

                      {isPractitionerDropdownOpen && (
                        <div className="absolute z-30 mt-1.5 w-full bg-white rounded-xl border border-slate-200 shadow-xl max-h-52 overflow-y-auto p-1.5 space-y-1 animate-in fade-in zoom-in-95 duration-150">
                          <button
                            type="button"
                            onClick={() => handleSelectPractitioner("")}
                            className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors cursor-pointer flex items-center justify-between ${
                              !teamMemberId ? "bg-primary/10 text-primary font-bold" : "hover:bg-slate-50 text-slate-700"
                            }`}
                          >
                            <span>-- Do Not Link / Standalone User --</span>
                            {!teamMemberId && <Check className="w-3.5 h-3.5 text-primary" />}
                          </button>
                          {unlinkedTeamMembers.map((tm) => {
                            const isSel = teamMemberId === tm.id;
                            return (
                              <button
                                key={tm.id}
                                type="button"
                                onClick={() => handleSelectPractitioner(tm.id)}
                                className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors cursor-pointer flex items-center justify-between ${
                                  isSel ? "bg-primary/10 text-primary font-bold" : "hover:bg-slate-50 text-slate-700"
                                }`}
                              >
                                <div>
                                  <p className="font-semibold text-slate-900">
                                    {tm.displayName || `${tm.firstName} ${tm.lastName}`}
                                  </p>
                                  <p className="text-[10px] text-slate-500">
                                    {tm.professionalTitle || tm.role || "Practitioner"} {tm.credentials ? `• ${tm.credentials}` : ""}
                                  </p>
                                </div>
                                {isSel && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Degree & Specialties */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-700 block">
                      Medical Degree / Qualifications
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. BDS, RDS, FCPS"
                      value={degree}
                      onChange={(e) => setDegree(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-700 block">
                      Specialties
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Orthodontics, Endodontics"
                      value={specialties}
                      onChange={(e) => setSpecialties(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* PASSWORD SECTION */}
            <div className="space-y-3 pt-1 border-t border-slate-100">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-slate-700">
                    Account Initial Password <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={generatePassword}
                    className="text-[11px] font-semibold text-primary hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Generate Strong Password
                  </button>
                </div>

                <div className="relative flex items-center">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (error) setError(null);
                    }}
                    placeholder="Enter secure initial password"
                    required
                    autoComplete="new-password"
                    className="w-full pl-10 pr-10 py-2.5 text-xs font-mono rounded-lg bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Password Strength Meter */}
              {password.length > 0 && (
                <div className="space-y-1.5 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-500 font-medium">Strength</span>
                    <span className={`font-semibold ${strengthTextColor}`}>{strengthLabel}</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 rounded-full ${strengthColor}`}
                      style={{ width: strengthWidth }}
                    />
                  </div>
                </div>
              )}

              {/* Real-time Checklist */}
              <div className="p-3.5 bg-slate-50/80 border border-slate-200/80 rounded-xl space-y-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Password Requirements
                </span>
                <div className="space-y-1.5 text-[11px]">
                  <div
                    className={`flex items-center gap-2 transition-colors duration-200 ${
                      reqMinLength ? "text-emerald-700 font-medium" : "text-slate-500"
                    }`}
                  >
                    <span
                      className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] shrink-0 transition-all duration-200 ${
                        reqMinLength
                          ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                          : "bg-slate-200 text-slate-400"
                      }`}
                    >
                      {reqMinLength ? <Check className="w-2.5 h-2.5" /> : "•"}
                    </span>
                    <span>At least 8 characters</span>
                  </div>

                  <div
                    className={`flex items-center gap-2 transition-colors duration-200 ${
                      reqUpperLower ? "text-emerald-700 font-medium" : "text-slate-500"
                    }`}
                  >
                    <span
                      className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] shrink-0 transition-all duration-200 ${
                        reqUpperLower
                          ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                          : "bg-slate-200 text-slate-400"
                      }`}
                    >
                      {reqUpperLower ? <Check className="w-2.5 h-2.5" /> : "•"}
                    </span>
                    <span>Contains uppercase and lowercase letters</span>
                  </div>

                  <div
                    className={`flex items-center gap-2 transition-colors duration-200 ${
                      reqDigitOrSpecial ? "text-emerald-700 font-medium" : "text-slate-500"
                    }`}
                  >
                    <span
                      className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] shrink-0 transition-all duration-200 ${
                        reqDigitOrSpecial
                          ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                          : "bg-slate-200 text-slate-400"
                      }`}
                    >
                      {reqDigitOrSpecial ? <Check className="w-2.5 h-2.5" /> : "•"}
                    </span>
                    <span>Contains at least one digit or special character</span>
                  </div>
                </div>
              </div>
            </div>

            {/* ACTION BUTTONS */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <Button type="button" variant="ghost" size="sm" onClick={onClose}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={isSubmitting || !password || !fullName || !email}
              >
                {isSubmitting ? "Creating Account..." : "Create Staff Account"}
              </Button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
