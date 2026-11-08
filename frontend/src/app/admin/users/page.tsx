"use client";

import { useEffect, useState, useMemo } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  AlertTriangle,
  Check,
  ChevronDown,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  Plus,
  RefreshCw,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  User,
  UserCheck,
  UserCog,
  UserPlus,
  UserX,
  Users,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/components/providers/auth-provider";
import { AnimatedPage } from "@/components/ui/animated-page";
import { Skeleton } from "@/components/ui/skeleton";
import { SuccessAlert } from "@/components/ui/success-draw";
import { AddTeamMemberModal } from "@/components/modals/add-team-member-modal";
import { StaggerList, StaggerItem } from "@/components/ui/stagger-list";
import {
  staggerContainer,
  listItem,
  modalOverlay,
  modalContent,
  reducedVariant,
} from "@/animations/variants";
import {
  adminBulkUpdateUserStatus,
  adminCreateUser,
  adminGetTeam,
  adminGetUsers,
  adminResetUserPassword,
  adminUpdateUserRole,
  adminUpdateUserStatus,
  AdminUser,
  TeamMember,
} from "@/lib/api";
import { useDebounce } from "@/hooks/use-debounce";
import { useSelection } from "@/hooks/use-selection";
import { BulkActionBar } from "@/components/ui/bulk-action-bar";
import { FilterChips } from "@/components/ui/filter-chips";
import { PlanBadge } from "@/components/ui/plan-badge";
import { QuotaProgress } from "@/components/ui/quota-progress";
import { ReferralInviteCard } from "@/components/ui/referral-invite-card";
import { toast as sonnerToast } from "sonner";

const ROLES = [
  { value: "admin", label: "Admin" },
  { value: "practice_manager", label: "Practice Manager" },
  { value: "doctor", label: "Doctor" },
  { value: "receptionist", label: "Receptionist" },
  { value: "nurse", label: "Nurse / Assistant" },
  { value: "cleaner", label: "Cleaner / Sterilization" },
];

export default function AdminUsersPage() {
  const { accessToken } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    setPage(1);
  }, [search, roleFilter]);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Create Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    fullName: "",
    email: "",
    role: "doctor",
    password: "",
    teamMemberId: "",
    requiresPasswordChange: true,
  });

  // Edit / Link Modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [editRole, setEditRole] = useState("doctor");
  const [editTeamMemberId, setEditTeamMemberId] = useState("");
  const [isEditPractitionerDropdownOpen, setIsEditPractitionerDropdownOpen] = useState(false);

  // Status Confirmation Modal (Deactivate / Reactivate)
  const [confirmStatusUser, setConfirmStatusUser] = useState<AdminUser | null>(null);

  // Reset Password Modal
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetPassword, setResetPassword] = useState("");
  const [showResetPasswordText, setShowResetPasswordText] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const triggerToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => {
      setToast((cur) => (cur?.message === message ? null : cur));
    }, 5000);
  };

  const generateResetPassword = () => {
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

    setResetPassword(shuffled);
    if (resetError) setResetError(null);
  };

  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const [uList, tList] = await Promise.all([
        adminGetUsers(accessToken),
        adminGetTeam(accessToken || undefined).catch(() => []),
      ]);
      setUsers(uList);
      setTeamMembers(tList);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to load staff accounts.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (accessToken) {
      queueMicrotask(() => {
        loadData();
      });
    }
  }, [accessToken]);

  const showToast = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  // Filter clinicians who do not already have a linked user account
  const unlinkedTeamMembers = teamMembers.filter(
    (tm) => !users.some((u) => u.teamMemberId === tm.id)
  );

  const handleSelectPractitioner = (tmId: string) => {
    if (!tmId) {
      setCreateForm({ ...createForm, teamMemberId: "" });
      return;
    }
    const tm = teamMembers.find((m) => m.id === tmId);
    if (!tm) return;

    // Auto-generate name and corporate email: dr.{first}.{last}@hiradental.com
    const cleanFirst = (tm.firstName || "").toLowerCase().replace(/[^a-z0-9]/g, "");
    const cleanLast = (tm.lastName || "").toLowerCase().replace(/[^a-z0-9]/g, "");
    const emailPrefix = cleanFirst && cleanLast ? `dr.${cleanFirst}.${cleanLast}` : (tm.displayName || "doctor").toLowerCase().replace(/[^a-z0-9]/g, ".");
    const generatedEmail = `${emailPrefix}@hiradental.com`;

    setCreateForm({
      ...createForm,
      teamMemberId: tmId,
      fullName: tm.displayName || `${tm.firstName} ${tm.lastName}`.trim(),
      email: generatedEmail,
      role: "doctor",
    });
  };

  // Create user
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await adminCreateUser(
        {
          fullName: createForm.fullName,
          email: createForm.email,
          role: createForm.role,
          password: createForm.password,
          teamMemberId: createForm.teamMemberId ? createForm.teamMemberId : null,
          requiresPasswordChange: createForm.requiresPasswordChange,
        },
        accessToken
      );
      showToast("Staff account created successfully.");
      setShowCreateModal(false);
      setCreateForm({
        fullName: "",
        email: "",
        role: "doctor",
        password: "",
        teamMemberId: "",
        requiresPasswordChange: true,
      });
      loadData();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to create account.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Status Toggle (Deactivate / Reactivate) Confirmation Handler
  const handleConfirmStatusToggle = async () => {
    if (!confirmStatusUser) return;
    const user = confirmStatusUser;
    const nextStatus = !user.isActive;
    setIsSubmitting(true);
    try {
      await adminUpdateUserStatus(user.id, nextStatus, accessToken);
      triggerToast(
        "success",
        nextStatus
          ? `Account reactivated for ${user.fullName}.`
          : `Account deactivated for ${user.fullName}. Sessions revoked.`
      );
      setConfirmStatusUser(null);
      loadData();
    } catch (err: any) {
      triggerToast("error", err.message || "Failed to update account status.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Edit role & team member link
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await adminUpdateUserRole(
        selectedUser.id,
        editRole,
        editTeamMemberId ? editTeamMemberId : null,
        accessToken
      );
      showToast("Staff account role and practitioner profile updated.");
      setShowEditModal(false);
      loadData();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to update role/link.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset password
  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    setIsSubmitting(true);
    setResetError(null);

    // Client-side validation aligned with backend security policy
    if (resetPassword.length < 8) {
      const msg = "Password must be at least 8 characters long.";
      setResetError(msg);
      triggerToast("error", msg);
      setIsSubmitting(false);
      return;
    }
    if (!/[A-Z]/.test(resetPassword)) {
      const msg = "Password must contain at least one uppercase letter.";
      setResetError(msg);
      triggerToast("error", msg);
      setIsSubmitting(false);
      return;
    }
    if (!/[a-z]/.test(resetPassword)) {
      const msg = "Password must contain at least one lowercase letter.";
      setResetError(msg);
      triggerToast("error", msg);
      setIsSubmitting(false);
      return;
    }
    if (!/[0-9]/.test(resetPassword)) {
      const msg = "Password must contain at least one digit.";
      setResetError(msg);
      triggerToast("error", msg);
      setIsSubmitting(false);
      return;
    }

    try {
      await adminResetUserPassword(selectedUser.id, resetPassword, accessToken);
      triggerToast("success", `Password updated successfully for ${selectedUser.email}`);
      setShowResetModal(false);
      setResetPassword("");
      setResetError(null);
      loadData();
    } catch (err: any) {
      const errorMsg = err.message || "Failed to reset password.";
      setResetError(errorMsg);
      triggerToast("error", errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const debouncedSearch = useDebounce(search, 300);

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const q = debouncedSearch.toLowerCase().trim();
      const matchesSearch =
        !q ||
        u.fullName.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q);
      const matchesRole = roleFilter === "all" || u.role.toLowerCase() === roleFilter.toLowerCase();
      return matchesSearch && matchesRole;
    });
  }, [users, debouncedSearch, roleFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / pageSize));
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [totalPages, page]);

  const paginatedUsers = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredUsers.slice(start, start + pageSize);
  }, [filteredUsers, page, pageSize]);

  const {
    selectedIds,
    count: selectedCount,
    isSelected,
    toggleSelect,
    clearSelection,
    toggleAll,
    isAllSelected,
    isIndeterminate,
  } = useSelection({
    items: paginatedUsers,
    getItemId: (u) => u.id,
  });

  const handleBulkStatus = async (isActive: boolean) => {
    if (selectedIds.length === 0) return;
    try {
      const res = await adminBulkUpdateUserStatus(
        selectedIds as string[],
        isActive,
        accessToken
      );
      // Optimistic local state update
      setUsers((prev) =>
        prev.map((u) =>
          selectedIds.includes(u.id) ? { ...u, isActive } : u
        )
      );
      clearSelection();
      sonnerToast.success(res.message);
    } catch (err: any) {
      sonnerToast.error(err.message || "Bulk update failed");
      loadData();
    }
  };

  // Real-time requirements checklist & strength meter for Reset Password modal
  const reqMinLength = resetPassword.length >= 8;
  const reqUpperLower = /[A-Z]/.test(resetPassword) && /[a-z]/.test(resetPassword);
  const reqDigitOrSpecial = /[0-9]/.test(resetPassword) || /[^A-Za-z0-9]/.test(resetPassword);

  const reqMetCount =
    (reqMinLength ? 1 : 0) + (reqUpperLower ? 1 : 0) + (reqDigitOrSpecial ? 1 : 0);

  let strengthLabel = "Weak";
  let strengthColor = "bg-rose-500";
  let strengthWidth = "33%";
  let strengthTextColor = "text-rose-400";

  if (reqMetCount === 3 && reqMinLength) {
    strengthLabel = "Strong";
    strengthColor = "bg-emerald-500";
    strengthWidth = "100%";
    strengthTextColor = "text-emerald-400";
  } else if (reqMetCount >= 2) {
    strengthLabel = "Fair";
    strengthColor = "bg-amber-400";
    strengthWidth = "66%";
    strengthTextColor = "text-amber-400";
  } else {
    strengthLabel = "Weak";
    strengthColor = "bg-rose-500";
    strengthWidth = resetPassword.length > 0 ? "33%" : "0%";
    strengthTextColor = "text-rose-400";
  }

  return (
    <AnimatedPage>
      {/* Floating Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className={`fixed top-5 right-5 z-[99999] max-w-sm w-full shadow-2xl rounded-2xl p-4 border flex items-center justify-between gap-3 backdrop-blur-md bg-white/95 ${
              toast.type === "success"
                ? "text-slate-900 border-emerald-200 ring-1 ring-emerald-500/20"
                : "text-slate-900 border-rose-200 ring-1 ring-rose-500/20"
            }`}
          >
            <div className="flex items-center gap-3">
              {toast.type === "success" ? (
                <div className="w-8 h-8 rounded-full bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-700 shrink-0">
                  <Check className="w-4 h-4" />
                </div>
              ) : (
                <div className="w-8 h-8 rounded-full bg-rose-100 border border-rose-200 flex items-center justify-center text-rose-700 shrink-0">
                  <AlertTriangle className="w-4 h-4" />
                </div>
              )}
              <p className="text-xs font-semibold leading-relaxed text-slate-800">{toast.message}</p>
            </div>
            <button
              type="button"
              onClick={() => setToast(null)}
              className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 shrink-0 transition-colors"
              aria-label="Dismiss notification"
            >
              ✕
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-bold tracking-tight text-ink font-serif">Staff Accounts</h1>
              <PlanBadge tier="Enterprise Tier" size="sm" />
            </div>
            <p className="text-xs text-muted-foreground">
              Manage authenticated user accounts, roles, access permissions, and practitioner profile links.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <QuotaProgress
              label="Staff Capacity"
              current={users.length}
              max={25}
              unit="seats"
              showUpgrade={true}
              className="hidden sm:block min-w-[210px]"
            />
            <Button
              onClick={() => setShowCreateModal(true)}
              variant="primary"
              size="sm"
              className="gap-2 shrink-0 rounded-xl"
            >
              <UserPlus className="h-4 w-4" />
              <span>Create Staff Account</span>
            </Button>
          </div>
        </div>

        {/* Notifications */}
        {successMessage && (
          <SuccessAlert message={successMessage} onClose={() => setSuccessMessage(null)} />
        )}
        {errorMessage && (
          <div className="p-3 bg-rose-50 text-rose-800 border border-rose-200 rounded-[var(--radius-card)] text-xs flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-rose-600 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Filter bar */}
        <Card className="p-4 bg-surface border-line space-y-3" hoverLift={true} index={0}>
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <input
                type="text"
                placeholder="Search staff by name or email (debounced)..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 px-3 border border-line rounded-[var(--radius-input)] text-xs bg-surface text-ink w-full sm:w-72 focus:outline-none focus:border-primary"
              />
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="h-9 px-3 border border-line rounded-[var(--radius-input)] text-xs bg-surface text-ink focus:outline-none focus:border-primary cursor-pointer"
              >
                <option value="all">All Roles</option>
                <option value="doctor">Doctors</option>
                <option value="receptionist">Receptionists</option>
                <option value="admin">Admins</option>
                <option value="nurse">Nurses</option>
                <option value="cleaner">Sterilization & Hygiene</option>
              </select>
            </div>
            <div className="text-xs text-muted-foreground font-medium">
              {filteredUsers.length === 0 ? (
                "Showing 0 accounts"
              ) : (
                `Showing ${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, filteredUsers.length)} of ${filteredUsers.length} accounts`
              )}
            </div>
          </div>

          {/* Active Filter Chips */}
          {(search || roleFilter !== "all") && (
            <FilterChips
              chips={[
                ...(search
                  ? [{ key: "search", label: "Search", value: search }]
                  : []),
                ...(roleFilter !== "all"
                  ? [{ key: "role", label: "Role", value: roleFilter }]
                  : []),
              ]}
              onRemove={(key) => {
                if (key === "search") setSearch("");
                if (key === "role") setRoleFilter("all");
              }}
              onClearAll={() => {
                setSearch("");
                setRoleFilter("all");
              }}
            />
          )}
        </Card>

        {/* Users Table */}
        <Card className="border-line overflow-hidden bg-surface" hoverLift={true} index={1}>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-sand/30 border-b border-line text-muted-foreground uppercase font-medium">
                <tr>
                  <th className="py-3 px-3 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      ref={(el) => {
                        if (el) el.indeterminate = isIndeterminate;
                      }}
                      onChange={toggleAll}
                      className="rounded border-slate-300 text-primary focus:ring-primary h-4 w-4 cursor-pointer"
                      aria-label="Select all accounts on page"
                    />
                  </th>
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Linked Team Member</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Security</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <motion.tbody
                variants={staggerContainer}
                initial="hidden"
                animate="visible"
                className="divide-y divide-line"
              >
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={`skel-user-${i}`} className="border-b border-line/60">
                      <td className="py-3.5 px-3 text-center">
                        <Skeleton className="w-4 h-4 rounded mx-auto" />
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <Skeleton className="w-8 h-8 rounded-full shrink-0" />
                          <div className="space-y-1.5 flex-1">
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-3 w-44" />
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4"><Skeleton className="h-5 w-20 rounded-full" /></td>
                      <td className="py-3.5 px-4"><Skeleton className="h-4 w-28" /></td>
                      <td className="py-3.5 px-4"><Skeleton className="h-5 w-16 rounded-full" /></td>
                      <td className="py-3.5 px-4"><Skeleton className="h-4 w-24" /></td>
                      <td className="py-3.5 px-4 text-right"><Skeleton className="h-7 w-20 rounded-lg ml-auto" /></td>
                    </tr>
                  ))
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-muted-foreground">
                      No staff accounts match the filter criteria.
                    </td>
                  </tr>
                ) : (
                  paginatedUsers.map((u, idx) => {
                    const linkedTm = teamMembers.find((t) => t.id === u.teamMemberId);
                    const isDoctor = u.role.toLowerCase() === "doctor";
                    const selected = isSelected(u.id);

                    return (
                      <motion.tr
                        key={u.id}
                        variants={listItem}
                        initial="hidden"
                        animate="visible"
                        className={`hover:bg-sand/10 transition-colors ${
                          selected ? "bg-primary/5 dark:bg-primary/10" : ""
                        }`}
                      >
                        <td className="py-3 px-3 text-center">
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={(e) =>
                              toggleSelect(u.id, idx, e.nativeEvent as unknown as React.MouseEvent)
                            }
                            className="rounded border-slate-300 text-primary focus:ring-primary h-4 w-4 cursor-pointer"
                            aria-label={`Select ${u.fullName}`}
                          />
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-ink">{u.fullName}</div>
                          <div className="text-muted-foreground text-[11px]">{u.email}</div>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium capitalize ${isDoctor
                                ? "bg-blue-50 text-blue-700 border border-blue-200"
                                : u.role.toLowerCase() === "admin"
                                  ? "bg-purple-50 text-purple-700 border border-purple-200"
                                  : "bg-amber-50 text-amber-700 border border-amber-200"
                              }`}
                          >
                            {u.role}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {linkedTm ? (
                            <div className="flex items-center gap-1.5 text-ink">
                              <UserCheck className="h-3.5 w-3.5 text-emerald-600 flex-shrink-0" />
                              <span className="font-medium">{linkedTm.displayName || `${linkedTm.firstName} ${linkedTm.lastName}`}</span>
                            </div>
                          ) : isDoctor ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-50 text-amber-800 text-[11px] font-medium border border-amber-200">
                              <AlertTriangle className="h-3 w-3" />
                              Unlinked Doctor
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-[11px]">—</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${u.isActive
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : "bg-rose-50 text-rose-700 border border-rose-200"
                              }`}
                          >
                            {u.isActive ? "Active" : "Deactivated"}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {u.requiresPasswordChange ? (
                            <span className="inline-flex items-center gap-1 text-[11px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                              <Lock className="h-3 w-3" />
                              Must Change Pwd
                            </span>
                          ) : (
                            <span className="text-emerald-700 text-[11px] flex items-center gap-1">
                              <ShieldCheck className="h-3.5 w-3.5" />
                              Normal
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-[11px] px-2"
                              onClick={() => {
                                setSelectedUser(u);
                                setEditRole(u.role);
                                setEditTeamMemberId(u.teamMemberId || "");
                                setShowEditModal(true);
                              }}
                            >
                              <UserCog className="h-3.5 w-3.5 mr-1" />
                              Edit / Link
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-[11px] px-2"
                              onClick={() => {
                                setSelectedUser(u);
                                setResetPassword("");
                                setResetError(null);
                                setShowResetPasswordText(false);
                                setShowResetModal(true);
                              }}
                            >
                              <KeyRound className="h-3.5 w-3.5 mr-1" />
                              Reset Pwd
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className={`h-7 text-[11px] px-2.5 rounded-lg font-medium ${
                                u.isActive
                                  ? "text-rose-700 border-rose-200 hover:bg-rose-50"
                                  : "text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                              }`}
                              onClick={() => setConfirmStatusUser(u)}
                            >
                              {u.isActive ? "Deactivate" : "Reactivate"}
                            </Button>
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })
                )}
              </motion.tbody>
            </table>
          </div>
          {filteredUsers.length > 0 && (
            <div className="border-t border-line px-4 py-3 bg-surface flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-xs text-muted-foreground">
                Page {page} of {totalPages} ({filteredUsers.length} total staff accounts)
              </div>
              <Pagination
                currentPage={page}
                onPageChange={setPage}
                pageSize={pageSize}
                onPageSizeChange={(newSize) => {
                  setPageSize(newSize);
                  setPage(1);
                }}
                totalItems={filteredUsers.length}
                pageSizeOptions={[6, 10, 20, 50]}
                itemName="Accounts"
              />
            </div>
          )}
        </Card>

        {/* Colleague Invitation & Care Referral Widget */}
        <ReferralInviteCard className="mt-2" />

        {/* Floating Bulk Action Bar */}
        <BulkActionBar
          selectedCount={selectedCount}
          onClearSelection={clearSelection}
          entityLabel="staff accounts"
          actions={[
            {
              label: "Reactivate Selected",
              icon: <UserCheck className="w-3.5 h-3.5" />,
              variant: "primary",
              onClick: () => handleBulkStatus(true),
            },
            {
              label: "Deactivate Selected",
              icon: <UserX className="w-3.5 h-3.5" />,
              variant: "danger",
              onClick: () => handleBulkStatus(false),
            },
          ]}
        />

        {/* CREATE MODAL / ADD TEAM MEMBER MODAL */}
        <AddTeamMemberModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSubmit={async ({ fullName, email, role, password, teamMemberId }) => {
            setIsSubmitting(true);
            try {
              await adminCreateUser(
                {
                  fullName,
                  email,
                  role,
                  password,
                  teamMemberId: teamMemberId || null,
                  requiresPasswordChange: true,
                },
                accessToken
              );
              showToast("Staff account created successfully.");
              setShowCreateModal(false);
              loadData();
            } finally {
              setIsSubmitting(false);
            }
          }}
          unlinkedTeamMembers={unlinkedTeamMembers}
          isSubmitting={isSubmitting}
        />

        {/* EDIT ROLE / LINK MODAL */}
        <AnimatePresence>
          {showEditModal && selectedUser && (
            <motion.div
              initial="hidden"
              animate="visible"
              exit="exit"
              variants={reducedVariant(modalOverlay)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            >
              <motion.div
                initial="hidden"
                animate="visible"
                exit="exit"
                variants={modalContent}
                className="bg-white rounded-2xl border border-slate-200/90 shadow-2xl w-full max-w-md p-6 space-y-5 text-slate-900"
              >
                <div className="flex items-start justify-between pb-3.5 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
                      <UserCog className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-base tracking-tight">
                        Edit Staff Account
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {selectedUser.fullName} &bull; <span className="font-mono text-slate-400">{selectedUser.email}</span>
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setShowEditModal(false);
                      setIsEditPractitionerDropdownOpen(false);
                    }}
                    className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                    aria-label="Close modal"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <form onSubmit={handleEditSubmit} className="space-y-4 text-xs">
                  {/* System Role Selection: Interactive Pill Buttons */}
                  <div className="space-y-1.5">
                    <label className="font-semibold text-slate-700 block">System Role</label>
                    <div className="grid grid-cols-3 gap-2">
                      {ROLES.map((r) => {
                        const isSelected = editRole === r.value;
                        return (
                          <button
                            key={r.value}
                            type="button"
                            onClick={() => setEditRole(r.value)}
                            className={`flex items-center justify-center py-2 px-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer select-none ${
                              isSelected
                                ? "bg-primary text-white border-primary shadow-xs ring-2 ring-primary/20"
                                : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-slate-300"
                            }`}
                          >
                            <span>{r.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Linked Practitioner Profile: Custom Dropdown Component */}
                  <div className="space-y-1.5">
                    <label className="font-semibold text-slate-700 block">
                      Linked Practitioner Profile
                    </label>
                    <div className="relative">
                      {(() => {
                        const selectedPractitioner = teamMembers.find((tm) => tm.id === editTeamMemberId);
                        return (
                          <>
                            <button
                              type="button"
                              onClick={() => setIsEditPractitionerDropdownOpen(!isEditPractitionerDropdownOpen)}
                              className="w-full flex items-center justify-between px-3.5 py-2.5 border border-slate-200 rounded-lg text-xs bg-slate-50 text-slate-900 hover:bg-slate-100/70 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-left cursor-pointer"
                            >
                              <div className="flex items-center gap-2 truncate">
                                <Stethoscope className="w-3.5 h-3.5 text-primary shrink-0" />
                                <span className="truncate font-medium">
                                  {selectedPractitioner
                                    ? `${selectedPractitioner.displayName || `${selectedPractitioner.firstName} ${selectedPractitioner.lastName}`} (${selectedPractitioner.role || "Practitioner"})`
                                    : "-- None / Unlinked --"}
                                </span>
                              </div>
                              <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isEditPractitionerDropdownOpen ? "rotate-180" : ""}`} />
                            </button>

                            {isEditPractitionerDropdownOpen && (
                              <div className="absolute z-30 mt-1.5 w-full bg-white rounded-xl border border-slate-200 shadow-xl max-h-52 overflow-y-auto p-1.5 space-y-1 animate-in fade-in zoom-in-95 duration-150">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditTeamMemberId("");
                                    setIsEditPractitionerDropdownOpen(false);
                                  }}
                                  className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors cursor-pointer flex items-center justify-between ${
                                    !editTeamMemberId ? "bg-primary/10 text-primary font-bold" : "hover:bg-slate-50 text-slate-700"
                                  }`}
                                >
                                  <span>-- None / Unlinked --</span>
                                  {!editTeamMemberId && <Check className="w-3.5 h-3.5 text-primary" />}
                                </button>
                                {teamMembers.map((tm) => {
                                  const isSel = editTeamMemberId === tm.id;
                                  return (
                                    <button
                                      key={tm.id}
                                      type="button"
                                      onClick={() => {
                                        setEditTeamMemberId(tm.id);
                                        setIsEditPractitionerDropdownOpen(false);
                                      }}
                                      className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors cursor-pointer flex items-center justify-between ${
                                        isSel ? "bg-primary/10 text-primary font-bold" : "hover:bg-slate-50 text-slate-700"
                                      }`}
                                    >
                                      <div>
                                        <p className="font-semibold text-slate-900">
                                          {tm.displayName || `${tm.firstName} ${tm.lastName}`}
                                        </p>
                                        <p className="text-[10px] text-slate-500">
                                          {tm.role || "Practitioner"} {tm.credentials ? `• ${tm.credentials}` : ""}
                                        </p>
                                      </div>
                                      {isSel && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed mt-1">
                      Linking a team member enables clinical scheduling and encounter creation for this doctor.
                    </p>
                  </div>

                  <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setShowEditModal(false);
                        setIsEditPractitionerDropdownOpen(false);
                      }}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" variant="primary" size="sm" disabled={isSubmitting}>
                      {isSubmitting ? "Saving..." : "Save Changes"}
                    </Button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* CONFIRM STATUS (DEACTIVATE / REACTIVATE) CUSTOM ALERT DIALOG */}
        <AnimatePresence>
          {confirmStatusUser && (
            <motion.div
              initial="hidden"
              animate="visible"
              exit="exit"
              variants={reducedVariant(modalOverlay)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            >
              <motion.div
                initial="hidden"
                animate="visible"
                exit="exit"
                variants={modalContent}
                className="bg-white rounded-2xl border border-slate-200/90 shadow-2xl w-full max-w-md p-6 space-y-4 text-slate-900"
              >
                <div className="flex items-start gap-3.5">
                  <div
                    className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border ${
                      confirmStatusUser.isActive
                        ? "bg-rose-50 border-rose-200 text-rose-600"
                        : "bg-emerald-50 border-emerald-200 text-emerald-600"
                    }`}
                  >
                    {confirmStatusUser.isActive ? (
                      <AlertTriangle className="w-5 h-5" />
                    ) : (
                      <UserCheck className="w-5 h-5" />
                    )}
                  </div>
                  <div className="space-y-1 flex-1">
                    <h3 className="text-base font-bold text-slate-900">
                      {confirmStatusUser.isActive
                        ? `Deactivate ${confirmStatusUser.fullName}?`
                        : `Reactivate ${confirmStatusUser.fullName}?`}
                    </h3>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      {confirmStatusUser.isActive
                        ? "This will immediately revoke all active sessions. The user will no longer be able to access the portal."
                        : "The user will regain access to their portal account with their previous permissions."}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={isSubmitting}
                    onClick={() => setConfirmStatusUser(null)}
                  >
                    Cancel
                  </Button>
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={handleConfirmStatusToggle}
                    className={`px-4 py-2 text-xs font-semibold rounded-lg shadow-sm transition-colors cursor-pointer disabled:opacity-50 ${
                      confirmStatusUser.isActive
                        ? "bg-rose-600 hover:bg-rose-700 text-white"
                        : "bg-emerald-600 hover:bg-emerald-700 text-white"
                    }`}
                  >
                    {isSubmitting
                      ? "Updating..."
                      : confirmStatusUser.isActive
                      ? "Deactivate Account"
                      : "Reactivate Account"}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* RESET PASSWORD MODAL (Light Mode Enterprise SaaS Theme) */}
        <AnimatePresence>
          {showResetModal && selectedUser && (
            <motion.div
              initial="hidden"
              animate="visible"
              exit="exit"
              variants={reducedVariant(modalOverlay)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            >
              <motion.div
                initial="hidden"
                animate="visible"
                exit="exit"
                variants={modalContent}
                className="bg-white rounded-2xl border border-slate-200/90 shadow-2xl w-full max-w-md p-6 space-y-4 text-slate-900"
              >
                {/* Header */}
                <div className="flex items-start justify-between pb-3.5 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900 tracking-tight">Reset Password</h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {selectedUser.fullName}{" "}
                        <span className="font-mono text-slate-400">({selectedUser.email})</span>
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setShowResetModal(false);
                      setResetError(null);
                    }}
                    className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                    aria-label="Close modal"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <p className="text-xs text-slate-500 leading-relaxed">
                  Setting a new temporary password will revoke all currently active sessions. The user will be required to change their password upon their next login.
                </p>

                {/* Modal-internal Error Banner */}
                {resetError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2.5">
                    <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                    <div className="flex-1 text-xs leading-snug">{resetError}</div>
                  </div>
                )}

                <form onSubmit={handleResetSubmit} className="space-y-4 text-xs">
                  {/* Recessed Input Field */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-slate-700">
                        New Temporary Password <span className="text-rose-500">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={generateResetPassword}
                        className="text-[11px] font-semibold text-primary hover:underline cursor-pointer"
                      >
                        Generate Secure
                      </button>
                    </div>

                    <div className="relative flex items-center">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                      <input
                        type={showResetPasswordText ? "text" : "password"}
                        value={resetPassword}
                        onChange={(e) => {
                          setResetPassword(e.target.value);
                          if (resetError) setResetError(null);
                        }}
                        placeholder="At least 8 chars (Upper, Lower, Digit)"
                        required
                        autoComplete="new-password"
                        className="w-full pl-10 pr-10 py-2.5 text-xs font-mono rounded-lg bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-medium"
                      />
                      <button
                        type="button"
                        onClick={() => setShowResetPasswordText(!showResetPasswordText)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                        aria-label={showResetPasswordText ? "Hide password" : "Show password"}
                      >
                        {showResetPasswordText ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Strength Meter */}
                  {resetPassword.length > 0 && (
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

                  {/* Action Buttons */}
                  <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setShowResetModal(false);
                        setResetError(null);
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      variant="primary"
                      size="sm"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1.5" />
                          <span>Resetting...</span>
                        </>
                      ) : (
                        "Reset Password & Revoke Sessions"
                      )}
                    </Button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AnimatedPage>
  );
}
