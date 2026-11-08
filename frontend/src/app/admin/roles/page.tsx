"use client";

import { toast } from "sonner";
import React, { Suspense, useCallback, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  Check,
  Edit2,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";

import { useAuth } from "@/components/providers/auth-provider";
import { AnimatedPage } from "@/components/ui/animated-page";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import { DestructiveConfirmDialog } from "@/components/ui/destructive-confirm-dialog";
import {
  adminCreateRole,
  adminDeleteRole,
  adminGetRolesPaginated,
  adminUpdateRole,
  type RoleItem,
} from "@/lib/api";

function RolesContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { accessToken } = useAuth();

  // Read URL params or fallback to defaults
  const pageParam = parseInt(searchParams.get("page") || "1", 10);
  const perPageParam = parseInt(searchParams.get("per_page") || "12", 10);
  const searchParam = searchParams.get("search") || "";

  // Data & Pagination state
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [totalRoles, setTotalRoles] = useState(0);
  const [currentPage, setCurrentPage] = useState(pageParam > 0 ? pageParam : 1);
  const [pageSize, setPageSize] = useState([6, 12, 24].includes(perPageParam) ? perPageParam : 12);
  const [searchQuery, setSearchQuery] = useState(searchParam);

  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Modal / Form state
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [roleToDelete, setRoleToDelete] = useState<RoleItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [form, setForm] = useState<{
    name: string;
    displayName: string;
    description: string;
    displayOrder: number;
    isActive: boolean;
  }>({
    name: "",
    displayName: "",
    description: "",
    displayOrder: 0,
    isActive: true,
  });

  // Sync state to URL without full-page reloads
  const updateUrlParams = useCallback(
    (page: number, size: number, search: string) => {
      const params = new URLSearchParams();
      if (page > 1) params.set("page", String(page));
      if (size !== 12) params.set("per_page", String(size));
      if (search.trim()) params.set("search", search.trim());

      const qs = params.toString() ? `?${params.toString()}` : "";
      router.replace(`${pathname}${qs}`, { scroll: false });
    },
    [pathname, router]
  );

  // Load roles from backend server-side pagination endpoint
  const loadRoles = useCallback(
    async (pageToLoad: number, sizeToLoad: number, searchToFilter: string) => {
      if (!accessToken) return;
      setIsFetching(true);
      setErrorMessage(null);

      try {
        const res = await adminGetRolesPaginated(accessToken, pageToLoad, sizeToLoad, searchToFilter);
        setRoles(res.items);
        setTotalRoles(res.total);

        // Clamping check: If the page requested is out of range, clamp back
        if (res.total > 0 && pageToLoad > res.total_pages) {
          const clamped = res.total_pages;
          setCurrentPage(clamped);
          updateUrlParams(clamped, sizeToLoad, searchToFilter);
          return;
        }

        updateUrlParams(pageToLoad, sizeToLoad, searchToFilter);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to load roles.";
        setErrorMessage(msg);
      } finally {
        setIsInitialLoading(false);
        setIsFetching(false);
      }
    },
    [accessToken, updateUrlParams]
  );

  useEffect(() => {
    if (accessToken) {
      loadRoles(currentPage, pageSize, searchQuery);
    }
  }, [accessToken, currentPage, pageSize, searchQuery, loadRoles]);

  // Handle Search Input Change -> Reset to page 1
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  // Handle Page Change
  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  // Handle Page Size Change -> Reset to page 1
  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setCurrentPage(1);
  };

  const openAddModal = () => {
    setEditingId(null);
    setForm({
      name: "",
      displayName: "",
      description: "",
      displayOrder: totalRoles + 1,
      isActive: true,
    });
    setErrorMessage(null);
    setShowModal(true);
  };

  const openEditModal = (role: RoleItem) => {
    setEditingId(role.id);
    setForm({
      name: role.name,
      displayName: role.displayName || role.name,
      description: role.description || "",
      displayOrder: role.displayOrder || 0,
      isActive: role.isActive,
    });
    setErrorMessage(null);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken) return;
    setIsSubmitting(true);
    setErrorMessage(null);

    const payload = {
      name: form.name.trim(),
      displayName: form.displayName.trim() || form.name.trim(),
      description: form.description.trim() || null,
      displayOrder: Number(form.displayOrder) || 0,
      isActive: form.isActive,
    };

    try {
      if (editingId) {
        await adminUpdateRole(editingId, payload, accessToken);
        toast.success("Role updated successfully");
      } else {
        await adminCreateRole(payload, accessToken);
        toast.success("Role created successfully");
      }
      setShowModal(false);
      loadRoles(currentPage, pageSize, searchQuery);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save role.";
      toast.error(msg);
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const openDeleteConfirm = (role: RoleItem) => {
    setRoleToDelete(role);
  };

  // Pattern #1: Optimistic UI for role deactivation with automatic rollback on error
  const confirmDeleteRole = async () => {
    if (!roleToDelete || !accessToken) return;
    setIsSubmitting(true);
    const previousRoles = [...roles];
    const targetId = roleToDelete.id;
    const targetName = roleToDelete.displayName;

    // Optimistically update list state immediately
    setRoles((prev) =>
      prev.map((r) => (r.id === targetId ? { ...r, isActive: false } : r))
    );

    try {
      await adminDeleteRole(targetId, accessToken);
      toast.success(`Role "${targetName}" deactivated.`);

      const remainingOnPage = roles.length - 1;
      const targetPage = remainingOnPage === 0 && currentPage > 1 ? currentPage - 1 : currentPage;
      setRoleToDelete(null);
      if (targetPage !== currentPage) {
        setCurrentPage(targetPage);
      } else {
        loadRoles(targetPage, pageSize, searchQuery);
      }
    } catch (err: unknown) {
      // Rollback on failure
      setRoles(previousRoles);
      const msg = err instanceof Error ? err.message : "Failed to deactivate role.";
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatedPage>
      <div className="space-y-6 max-w-5xl mx-auto pb-12">
        {/* Header Bar */}
        <div className="border-b border-border pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="eyebrow mb-1">Practice Management</p>
            <h1 className="text-2xl sm:text-3xl font-display text-foreground font-normal">
              Manage Roles
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
              Configure system and clinical role categories for dentists, specialists, and clinic staff.
            </p>
          </div>

          <Button id="add-role-btn" onClick={openAddModal} variant="primary" size="sm" className="gap-1.5 shadow-xs">
            <Plus className="h-4 w-4" />
            <span>Add Role</span>
          </Button>
        </div>

        {/* Notifications */}
        {successMessage && (
          <div
            role="status"
            className="rounded-xl border border-emerald-200 bg-emerald-50 dark:border-emerald-900/50 dark:bg-emerald-950/40 p-4 text-xs font-medium text-emerald-800 dark:text-emerald-300 flex items-center gap-2"
          >
            <Check className="h-4 w-4 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {errorMessage && (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-950/40 p-4 text-xs font-medium text-red-800 dark:text-red-300 flex items-center gap-2"
          >
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Roles Table Container */}
        <div className="bg-card rounded-2xl border border-border shadow-xs overflow-hidden">
          {/* Card Topbar: Search & Counts */}
          <div className="p-4 sm:p-5 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-foreground">Active &amp; System Roles</h2>
                <span className="text-xs text-muted-foreground font-medium">
                  {totalRoles} roles registered
                </span>
              </div>
            </div>

            {/* Search Input Filter */}
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search roles..."
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="w-full pl-8 pr-8 py-1.5 text-xs rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-medium"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => handleSearchChange("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5"
                  aria-label="Clear search"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Table / Loading / Empty states */}
          {isInitialLoading ? (
            /* Shimmer skeleton rows while initial load */
            <div className="p-6 space-y-3">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="h-10 w-full rounded-xl bg-muted/40 animate-pulse flex items-center justify-between px-4"
                >
                  <div className="h-3 w-1/4 bg-muted/70 rounded" />
                  <div className="h-3 w-1/4 bg-muted/70 rounded" />
                  <div className="h-3 w-1/6 bg-muted/70 rounded" />
                </div>
              ))}
            </div>
          ) : totalRoles === 0 ? (
            /* Empty state */
            <div className="p-12 text-center space-y-3">
              <ShieldCheck className="h-10 w-10 text-muted-foreground/40 mx-auto" />
              <p className="text-sm font-semibold text-foreground">
                {searchQuery ? `No roles matching "${searchQuery}"` : "No roles found"}
              </p>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                {searchQuery
                  ? "Try refining your search keyword or clear the search filter."
                  : "No role classifications have been defined yet."}
              </p>
              {searchQuery ? (
                <Button onClick={() => handleSearchChange("")} variant="outline" size="sm">
                  Clear Search Filter
                </Button>
              ) : (
                <Button onClick={openAddModal} variant="outline" size="sm">
                  Add First Role
                </Button>
              )}
            </div>
          ) : (
            <div className="relative overflow-x-auto">
              {/* Subtle loading overlay on refetch (no flicker) */}
              {isFetching && (
                <div className="absolute inset-0 bg-background/30 backdrop-blur-[1px] flex items-center justify-center z-10 transition-opacity">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
              )}

              <table id="roles-table" className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/30 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                    <th className="py-3 px-4">Name</th>
                    <th className="py-3 px-4">Display Name</th>
                    <th className="py-3 px-4">Description</th>
                    <th className="py-3 px-4 text-center">Active</th>
                    <th className="py-3 px-4 text-center">Display Order</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {roles.map((r) => (
                    <tr
                      key={r.id}
                      className="hover:bg-muted/40 transition-colors"
                    >
                      <td className="py-3 px-4 font-mono font-medium text-foreground">
                        {r.name}
                      </td>
                      <td className="py-3 px-4 font-semibold text-foreground">
                        <span className="inline-block rounded-full bg-primary/10 px-2.5 py-0.5 text-[10.5px] font-bold text-primary uppercase">
                          {r.displayName}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground max-w-xs truncate">
                        {r.description || "—"}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            r.isActive
                              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {r.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center font-mono text-muted-foreground">
                        {r.displayOrder}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEditModal(r)}
                            title="Edit Role"
                            aria-label={`Edit role ${r.displayName}`}
                            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors cursor-pointer"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          {!r.isSystem && (
                            <button
                              type="button"
                              onClick={() => openDeleteConfirm(r)}
                              title="Deactivate Role"
                              aria-label={`Deactivate role ${r.displayName}`}
                              className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors cursor-pointer"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Server-side Pagination Component */}
              <div className="border-t border-border px-3">
                <Pagination
                  currentPage={currentPage}
                  totalItems={totalRoles}
                  pageSize={pageSize}
                  pageSizeOptions={[6, 12, 24]}
                  onPageChange={handlePageChange}
                  onPageSizeChange={handlePageSizeChange}
                  itemName="Roles"
                />
              </div>
            </div>
          )}
        </div>

        {/* Create / Edit Role Modal (Light Mode Enterprise SaaS Theme) */}
        {showModal && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label={editingId ? "Edit Role" : "Add Role"}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowModal(false);
            }}
          >
            <div className="bg-white text-slate-900 rounded-2xl border border-slate-200/90 shadow-2xl w-full max-w-xl p-6 sm:p-7 space-y-5 animate-in zoom-in-95 duration-200">
              {/* Header */}
              <div className="flex items-start justify-between pb-3.5 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-base tracking-tight">
                      {editingId ? "Edit Role Definition" : "Create New Role"}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Configure system identifier, public display name, and clinical scope.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                  aria-label="Close modal"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4 text-xs">
                {/* 2-Column Inputs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 block">
                      System Identifier Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      disabled={Boolean(editingId)}
                      placeholder="e.g. Endodontist"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-xs bg-slate-50 text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:opacity-50 font-medium"
                    />
                    <p className="text-[10px] text-slate-400">
                      Canonical unique key used in permissions and API checks.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 block">
                      Public Display Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Endodontic Specialist"
                      value={form.displayName}
                      onChange={(e) => setForm({ ...form, displayName: e.target.value })}
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-xs bg-slate-50 text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                    <p className="text-[10px] text-slate-400">
                      Shown across appointment schedules and clinician cards.
                    </p>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 block">Clinical Scope / Description</label>
                  <textarea
                    rows={3}
                    placeholder="Describe clinical scope, typical duties, or scheduling tier..."
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-xs bg-slate-50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary leading-relaxed"
                  />
                </div>

                {/* Display Order & Active Toggle Switch */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 block">Display Order</label>
                    <input
                      type="number"
                      value={form.displayOrder}
                      onChange={(e) => setForm({ ...form, displayOrder: parseInt(e.target.value, 10) || 0 })}
                      className="w-28 px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-white text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3">
                    <span className="text-xs font-semibold text-slate-700">Active for Assignment</span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={form.isActive}
                      onClick={() => setForm({ ...form, isActive: !form.isActive })}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary/20 ${
                        form.isActive ? "bg-primary" : "bg-slate-300"
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                          form.isActive ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowModal(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    disabled={isSubmitting}
                    className="font-semibold shadow-xs rounded-full px-5"
                  >
                    {isSubmitting ? "Saving..." : editingId ? "Update Role" : "Create Role"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Pattern #19: Destructive Action Protection Dialog */}
        <DestructiveConfirmDialog
          isOpen={Boolean(roleToDelete)}
          title={`Deactivate Role "${roleToDelete?.displayName}"?`}
          description="This will deactivate the role for clinical staff and system assignment. Existing assignments will be archived."
          confirmText="Deactivate Role"
          isSubmitting={isSubmitting}
          onConfirm={confirmDeleteRole}
          onClose={() => setRoleToDelete(null)}
        />
      </div>
    </AnimatedPage>
  );
}

export default function AdminRolesPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[400px] flex items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      }
    >
      <RolesContent />
    </Suspense>
  );
}
