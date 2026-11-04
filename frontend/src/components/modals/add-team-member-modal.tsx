"use client";

import React, { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  Building2,
  GraduationCap,
  Lock,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Upload,
  UserCheck,
  UserPlus,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PasswordField } from "@/components/ui/password-field";
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
  { value: "pharmacist", label: "Pharmacist", icon: Building2 },
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
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [degree, setDegree] = useState("");
  const [specialties, setSpecialties] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSelectPractitioner = (id: string) => {
    setTeamMemberId(id);
    if (!id) {
      setIsEmailLocked(false);
      return;
    }
    const tm = unlinkedTeamMembers.find((t) => t.id === id);
    if (tm) {
      setFullName(tm.displayName || `${tm.firstName} ${tm.lastName}`);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!password) {
      setError("Password is required.");
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
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-team-title"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 8 }}
          transition={{ duration: 0.2 }}
          className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-lg p-6 space-y-4 my-8"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <h3 id="add-team-title" className="font-semibold text-slate-900 dark:text-white text-base flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-primary" />
              Create New Staff / Team Member
            </h3>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm p-1 rounded-lg transition-colors cursor-pointer"
              aria-label="Close modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {error && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs rounded-xl border border-rose-200 dark:border-rose-900">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {/* TOP SECTION: CIRCULAR DRAG & DROP PHOTO UPLOAD ZONE */}
            <div className="flex flex-col items-center justify-center pt-1 pb-1">
              <div
                onClick={() => document.getElementById("add-member-photo-input")?.click()}
                className="w-20 h-20 rounded-full border-2 border-dashed border-primary/40 hover:border-primary bg-primary/5 hover:bg-primary/10 transition-all cursor-pointer relative group flex flex-col items-center justify-center overflow-hidden shadow-xs"
              >
                {photoPreview ? (
                  <>
                    <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white transition-opacity">
                      <Upload className="w-4 h-4 mb-0.5" />
                      <span className="text-[9px] font-semibold">Change</span>
                    </div>
                  </>
                ) : (
                  <>
                    <Upload className="w-5 h-5 text-primary/70 group-hover:scale-110 transition-transform mb-1" />
                    <span className="text-[10px] font-semibold text-muted-foreground group-hover:text-primary transition-colors text-center px-1">
                      Upload
                    </span>
                  </>
                )}
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
              <span className="text-[10px] text-muted-foreground mt-1">
                Profile photo (optional, click to upload)
              </span>
            </div>

            {/* HORIZONTAL SCROLLABLE SOFT PILLS FOR SYSTEM ROLE */}
            <div className="space-y-1.5">
              <label className="font-bold text-slate-700 dark:text-slate-300 block">
                1. System Role <span className="text-destructive">*</span>
              </label>
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
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
                      className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                        isSelected
                          ? "bg-primary !text-white shadow-xs ring-1 ring-primary/40 font-bold"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-foreground"
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{r.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Clinician link if doctor */}
            {role === "doctor" && unlinkedTeamMembers.length > 0 && (
              <div className="p-3 rounded-xl border border-primary/20 bg-primary/5 space-y-2">
                <label className="font-bold text-primary flex items-center justify-between text-xs">
                  <span>2. Link to Clinical Team Member</span>
                  <span className="text-[10px] font-mono text-muted-foreground">
                    {unlinkedTeamMembers.length} available
                  </span>
                </label>
                <select
                  value={teamMemberId}
                  onChange={(e) => handleSelectPractitioner(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg text-xs bg-white dark:bg-slate-900 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 font-medium"
                >
                  <option value="">-- Choose Doctor from Clinical Team --</option>
                  {unlinkedTeamMembers.map((tm) => (
                    <option key={tm.id} value={tm.id}>
                      {tm.displayName || `${tm.firstName} ${tm.lastName}`} ({tm.professionalTitle || "Dental Surgeon"})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* CONDITIONAL MEDICAL FIELDS (Degree, Specialties) */}
            {(role === "doctor" || role === "nurse") && (
              <div className="space-y-2.5 p-3 rounded-2xl bg-primary/5 border border-primary/20">
                <div className="flex items-center gap-1.5 text-xs font-bold text-primary">
                  <GraduationCap className="w-3.5 h-3.5" />
                  <span>Clinical Credentials & Specialties</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                      Medical Degree / Credentials
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. BDS, RDS, FCPS"
                      value={degree}
                      onChange={(e) => setDegree(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg text-xs bg-white dark:bg-slate-900 text-foreground outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                      Specialties
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Orthodontics, Endodontics"
                      value={specialties}
                      onChange={(e) => setSpecialties(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg text-xs bg-white dark:bg-slate-900 text-foreground outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Full Name & Email */}
            <div className="space-y-3 pt-1">
              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">Staff Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dr. Hira Babar"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl text-xs bg-slate-50 dark:bg-slate-900/60 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-700 dark:text-slate-300">Institutional Email *</label>
                  {isEmailLocked && (
                    <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <Lock className="w-3 h-3" /> Locked to practitioner
                    </span>
                  )}
                </div>
                <div className="relative">
                  <input
                    type="email"
                    required
                    readOnly={isEmailLocked}
                    placeholder="e.g. hira.babar@hiradental.com"
                    value={email}
                    onChange={(e) => !isEmailLocked && setEmail(e.target.value)}
                    className={`w-full px-3.5 py-2.5 border rounded-xl text-xs font-mono outline-none transition-colors ${
                      isEmailLocked
                        ? "border-slate-200 dark:border-slate-800 bg-slate-100/70 dark:bg-slate-800/70 text-slate-500 cursor-not-allowed pr-8"
                        : "border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/20"
                    }`}
                  />
                  {isEmailLocked && (
                    <Lock className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-3 pointer-events-none" />
                  )}
                </div>
              </div>
            </div>

            {/* Enhanced Password Field with Padlock, Show/Hide, Strength Meter & Checklist */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <PasswordField
                value={password}
                onChange={setPassword}
                required={true}
                label="Staff Password"
                placeholder="Set secure password"
                showStrengthMeter={true}
                showGenerator={true}
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <Button type="button" variant="outline" size="sm" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" disabled={isSubmitting || !password}>
                {isSubmitting ? "Creating Account..." : "Create Staff Account"}
              </Button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
