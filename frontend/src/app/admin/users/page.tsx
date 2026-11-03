"use client";

import { PasswordField } from "@/components/ui/password-field";
import { useEffect, useState, useMemo } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  AlertTriangle,
  Check,
  KeyRound,
  Lock,
  Plus,
  RefreshCw,
  Shield,
  ShieldAlert,
  ShieldCheck,
  User,
  UserCheck,
  UserCog,
  UserPlus,
  UserX,
  Users,
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
  adminCreateUser,
  adminGetTeam,
  adminGetUsers,
  adminResetUserPassword,
  adminUpdateUserRole,
  adminUpdateUserStatus,
  AdminUser,
  TeamMember,
} from "@/lib/api";

const ROLES = [
  { value: "admin", label: "Admin" },
  { value: "doctor", label: "Doctor" },
  { value: "receptionist", label: "Receptionist" },
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

  // Reset Password Modal
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetPassword, setResetPassword] = useState("");

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

  // Toggle status
  const handleToggleStatus = async (user: AdminUser) => {
    const nextStatus = !user.isActive;
    const confirmMsg = nextStatus
      ? `Reactivate account for ${user.fullName}?`
      : `Deactivate account for ${user.fullName}? This will immediately revoke all active sessions.`;
    if (!window.confirm(confirmMsg)) return;

    try {
      await adminUpdateUserStatus(user.id, nextStatus, accessToken);
      showToast(nextStatus ? "Account reactivated." : "Account deactivated. Sessions revoked.");
      loadData();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to update account status.");
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
    setErrorMessage(null);
    try {
      await adminResetUserPassword(selectedUser.id, resetPassword, accessToken);
      showToast("Password reset successfully. Active sessions revoked.");
      setShowResetModal(false);
      setResetPassword("");
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to reset password.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.fullName.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === "all" || u.role.toLowerCase() === roleFilter.toLowerCase();
    return matchesSearch && matchesRole;
  });

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / pageSize));
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [totalPages, page]);

  const paginatedUsers = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredUsers.slice(start, start + pageSize);
  }, [filteredUsers, page, pageSize]);

  return (
    <AnimatedPage>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-ink font-serif">Staff Accounts</h1>
            <p className="text-xs text-muted-foreground mt-1">
              Manage authenticated user accounts, roles, access permissions, and practitioner profile links.
            </p>
          </div>
          <Button
            onClick={() => setShowCreateModal(true)}
            variant="primary"
            size="sm"
            className="gap-2"
          >
            <UserPlus className="h-4 w-4" />
            Create Staff Account
          </Button>
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
        <Card className="p-4 bg-surface border-line flex flex-col sm:flex-row gap-3 items-center justify-between" hoverLift={true} index={0}>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <input
              type="text"
              placeholder="Search staff by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 px-3 border border-line rounded-[var(--radius-input)] text-xs bg-surface text-ink w-full sm:w-72 focus:outline-none focus:border-primary"
            />
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="h-9 px-3 border border-line rounded-[var(--radius-input)] text-xs bg-surface text-ink focus:outline-none focus:border-primary"
            >
              <option value="all">All Roles</option>
              <option value="doctor">Doctors</option>
              <option value="receptionist">Receptionists</option>
              <option value="admin">Admins</option>
            </select>
          </div>
          <div className="text-xs text-muted-foreground font-medium">
            {filteredUsers.length === 0 ? (
              "Showing 0 accounts"
            ) : (
              `Showing ${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, filteredUsers.length)} of ${filteredUsers.length} accounts`
            )}
          </div>
        </Card>

        {/* Users Table */}
        <Card className="border-line overflow-hidden bg-surface" hoverLift={true} index={1}>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-sand/30 border-b border-line text-muted-foreground uppercase font-medium">
                <tr>
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
                    <td colSpan={6} className="py-8 text-center text-muted-foreground">
                      No staff accounts match the filter criteria.
                    </td>
                  </tr>
                ) : (
                  paginatedUsers.map((u) => {
                    const linkedTm = teamMembers.find((t) => t.id === u.teamMemberId);
                    const isDoctor = u.role.toLowerCase() === "doctor";

                    return (
                      <motion.tr
                        key={u.id}
                        variants={listItem}
                        initial="hidden"
                        animate="visible"
                        className="hover:bg-sand/10 transition-colors"
                      >
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
                                setShowResetModal(true);
                              }}
                            >
                              <KeyRound className="h-3.5 w-3.5 mr-1" />
                              Reset Pwd
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className={`h-7 text-[11px] px-2 ${u.isActive
                                  ? "text-rose-700 border-rose-300 hover:bg-rose-50"
                                  : "text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                                }`}
                              onClick={() => handleToggleStatus(u)}
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
              className="fixed inset-0 bg-ink/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            >
              <motion.div
                initial="hidden"
                animate="visible"
                exit="exit"
                variants={modalContent}
                className="bg-surface rounded-[var(--radius-modal)] border border-line shadow-xl w-full max-w-md p-6 space-y-4"
              >
                <div className="flex items-center justify-between border-b border-line pb-3">
                  <h3 className="font-semibold text-ink text-base flex items-center gap-2">
                    <UserCog className="h-4 w-4 text-primary" />
                    Edit Staff Account: {selectedUser.fullName}
                  </h3>
                  <button
                    onClick={() => setShowEditModal(false)}
                    className="text-muted-foreground hover:text-ink text-sm"
                  >
                    ✕
                  </button>
                </div>

                <form onSubmit={handleEditSubmit} className="space-y-4 text-xs">
                  <div className="space-y-1">
                    <label className="font-medium text-ink">Role</label>
                    <select
                      value={editRole}
                      onChange={(e) => setEditRole(e.target.value)}
                      className="w-full h-9 px-3 border border-line rounded-[var(--radius-input)] text-xs bg-surface text-ink focus:outline-none focus:border-primary"
                    >
                      {ROLES.map((r) => (
                        <option key={r.value} value={r.value}>
                          {r.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="font-medium text-ink">Linked Practitioner Profile</label>
                    <select
                      value={editTeamMemberId}
                      onChange={(e) => setEditTeamMemberId(e.target.value)}
                      className="w-full h-9 px-3 border border-line rounded-[var(--radius-input)] text-xs bg-surface text-ink focus:outline-none focus:border-primary"
                    >
                      <option value="">-- None / Unlinked --</option>
                      {teamMembers.map((tm) => (
                        <option key={tm.id} value={tm.id}>
                          {tm.displayName || `${tm.firstName} ${tm.lastName}`} ({tm.role || "Practitioner"})
                        </option>
                      ))}
                    </select>
                    <p className="text-[10px] text-muted-foreground">
                      Linking a team member enables clinical scheduling and encounter creation for this doctor.
                    </p>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-3 border-t border-line">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowEditModal(false)}
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

        {/* RESET PASSWORD MODAL */}
        <AnimatePresence>
          {showResetModal && selectedUser && (
            <motion.div
              initial="hidden"
              animate="visible"
              exit="exit"
              variants={reducedVariant(modalOverlay)}
              className="fixed inset-0 bg-ink/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            >
              <motion.div
                initial="hidden"
                animate="visible"
                exit="exit"
                variants={modalContent}
                className="bg-surface rounded-[var(--radius-modal)] border border-line shadow-xl w-full max-w-md p-6 space-y-4"
              >
                <div className="flex items-center justify-between border-b border-line pb-3">
                  <h3 className="font-semibold text-ink text-base flex items-center gap-2">
                    <KeyRound className="h-4 w-4 text-primary" />
                    Reset Password: {selectedUser.fullName}
                  </h3>
                  <button
                    onClick={() => setShowResetModal(false)}
                    className="text-muted-foreground hover:text-ink text-sm"
                  >
                    ✕
                  </button>
                </div>

                <p className="text-xs text-muted-foreground">
                  Setting a new temporary password will revoke all currently active sessions. The user will be required to change their password upon their next login.
                </p>

                <form onSubmit={handleResetSubmit} className="space-y-4 text-xs">
                  <PasswordField
                    label="New Temporary Password"
                    value={resetPassword}
                    onChange={setResetPassword}
                    placeholder="At least 8 chars (Upper, Lower, Digit, Special)"
                    required
                    showStrengthMeter
                    showGenerator
                  />

                  <div className="flex items-center justify-end gap-2 pt-3 border-t border-line">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowResetModal(false)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" variant="primary" size="sm" disabled={isSubmitting}>
                      {isSubmitting ? "Resetting..." : "Reset Password & Revoke Sessions"}
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
