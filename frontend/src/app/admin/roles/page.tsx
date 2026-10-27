"use client";

import React, { useEffect, useState } from "react";
import {
  Check,
  Edit2,
  Plus,
  ShieldCheck,
  Trash2,
  X,
  AlertCircle,
  RefreshCw,
} from "lucide-react";

import { useAuth } from "@/components/providers/auth-provider";
import { AnimatedPage } from "@/components/ui/animated-page";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  adminCreateRole,
  adminDeleteRole,
  adminGetRoles,
  adminUpdateRole,
  type RoleItem,
} from "@/lib/api";

export default function AdminRolesPage() {
  const { accessToken } = useAuth();
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Modal / Form state
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
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

  const loadRoles = async () => {
    if (!accessToken) return;
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const data = await adminGetRoles(accessToken);
      setRoles(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load roles.";
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (accessToken) {
      loadRoles();
    }
  }, [accessToken]);

  const openAddModal = () => {
    setEditingId(null);
    setForm({
      name: "",
      displayName: "",
      description: "",
      displayOrder: roles.length + 1,
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
        setSuccessMessage(`Role "${payload.displayName}" updated successfully.`);
      } else {
        await adminCreateRole(payload, accessToken);
        setSuccessMessage(`Role "${payload.displayName}" created successfully.`);
      }
      setShowModal(false);
      loadRoles();
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save role.";
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (role: RoleItem) => {
    if (!accessToken) return;
    if (!confirm(`Are you sure you want to deactivate role "${role.displayName}"?`)) {
      return;
    }
    try {
      await adminDeleteRole(role.id, accessToken);
      setSuccessMessage(`Role "${role.displayName}" deactivated.`);
      loadRoles();
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to delete role.";
      setErrorMessage(msg);
    }
  };

  return (
    <AnimatedPage>
      <div className="space-y-6 max-w-5xl">
        {/* Header Bar */}
        <div className="border-b border-line pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="eyebrow mb-1">Practice Management</p>
            <h1 className="text-2xl sm:text-3xl font-display text-ink font-normal">
              Manage Roles
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-ink-soft">
              Configure system and clinical role categories for dentists, specialists, and clinic staff.
            </p>
          </div>

          <Button id="add-role-btn" onClick={openAddModal} variant="primary" size="sm">
            <Plus className="h-3.5 w-3.5 mr-1" />
            <span>Add Role</span>
          </Button>
        </div>

        {/* Notifications */}
        {successMessage && (
          <div
            role="status"
            className="rounded-lg border border-emerald-200 bg-emerald-50 dark:border-emerald-900/50 dark:bg-emerald-950/40 p-4 text-xs font-medium text-emerald-800 dark:text-emerald-300 flex items-center gap-2"
          >
            <Check className="h-4 w-4" />
            <span>{successMessage}</span>
          </div>
        )}

        {errorMessage && (
          <div
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-950/40 p-4 text-xs font-medium text-red-800 dark:text-red-300 flex items-center gap-2"
          >
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Roles Table */}
        <div className="bg-white dark:bg-gray-900/60 rounded-2xl border border-line dark:border-gray-800 shadow-xs overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-line/60 dark:border-gray-800/60 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-forest" />
              <h2 className="text-sm font-semibold text-ink dark:text-white">Active &amp; System Roles</h2>
            </div>
            <span className="text-xs text-ink-soft font-medium">
              {roles.length} roles registered
            </span>
          </div>

          {isLoading ? (
            <div className="py-12 flex justify-center items-center">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-forest border-t-transparent" />
            </div>
          ) : roles.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <ShieldCheck className="h-10 w-10 text-ink-soft/40 mx-auto" />
              <p className="text-sm font-medium text-ink dark:text-white">No roles found.</p>
              <Button onClick={openAddModal} variant="outline" size="sm">
                Add Default Role
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table id="roles-table" className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-line/60 dark:border-gray-800 bg-cream/30 dark:bg-gray-800/40 text-[11px] font-semibold text-ink-soft uppercase tracking-wider">
                    <th className="py-3.5 px-4">Name</th>
                    <th className="py-3.5 px-4">Display Name</th>
                    <th className="py-3.5 px-4">Description</th>
                    <th className="py-3.5 px-4 text-center">Active</th>
                    <th className="py-3.5 px-4 text-center">Display Order</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/40 dark:divide-gray-800">
                  {roles.map((r) => (
                    <tr
                      key={r.id}
                      className="hover:bg-cream/40 dark:hover:bg-gray-800/40 transition-colors"
                    >
                      <td className="py-3.5 px-4 font-mono font-medium text-ink dark:text-white">
                        {r.name}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-ink dark:text-white">
                        <span className="inline-block rounded-full bg-forest/10 px-2.5 py-0.5 text-[10.5px] font-semibold text-forest uppercase">
                          {r.displayName}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-ink-soft dark:text-gray-300 max-w-xs truncate">
                        {r.description || "—"}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                            r.isActive
                              ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300"
                              : "bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-400"
                          }`}
                        >
                          {r.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono text-ink-soft">
                        {r.displayOrder}
                      </td>
                      <td className="py-3.5 px-4 text-right space-x-1">
                        <button
                          onClick={() => openEditModal(r)}
                          className="p-1.5 rounded-lg text-ink-soft hover:text-ink hover:bg-cream/60 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                          title="Edit role"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(r)}
                          className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                          title="Deactivate role"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Add / Edit Role Modal */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="bg-white dark:bg-gray-900 rounded-3xl border border-line dark:border-gray-800 shadow-2xl max-w-md w-full p-6 space-y-5">
              <div className="flex items-center justify-between border-b border-line pb-3">
                <h3 className="font-display text-lg text-ink dark:text-white">
                  {editingId ? "Edit Role" : "Add New Role"}
                </h3>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-1.5 rounded-full text-ink-soft hover:text-ink hover:bg-cream cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="role-name-input" className="block text-[11px] font-semibold text-ink-soft uppercase tracking-wider mb-1">
                    Role Name (Identifier) *
                  </label>
                  <input
                    id="role-name-input"
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. Sleep Dentist"
                    className="w-full rounded-xl border border-line dark:border-gray-700 bg-cream/40 dark:bg-gray-800/80 px-3.5 py-2 text-xs text-ink dark:text-white outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                  <p className="text-[10px] text-ink-soft mt-1">Unique technical key or name stored on team records.</p>
                </div>

                <div>
                  <label htmlFor="role-display-name-input" className="block text-[11px] font-semibold text-ink-soft uppercase tracking-wider mb-1">
                    Display Name *
                  </label>
                  <input
                    id="role-display-name-input"
                    type="text"
                    required
                    value={form.displayName}
                    onChange={(e) => setForm({ ...form, displayName: e.target.value })}
                    placeholder="e.g. Sleep Specialist"
                    className="w-full rounded-xl border border-line dark:border-gray-700 bg-cream/40 dark:bg-gray-800/80 px-3.5 py-2 text-xs text-ink dark:text-white outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                <div>
                  <label htmlFor="role-description-input" className="block text-[11px] font-semibold text-ink-soft uppercase tracking-wider mb-1">
                    Description
                  </label>
                  <textarea
                    id="role-description-input"
                    rows={2}
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Short description of role responsibilities..."
                    className="w-full rounded-xl border border-line dark:border-gray-700 bg-cream/40 dark:bg-gray-800/80 px-3.5 py-2 text-xs text-ink dark:text-white outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="role-order-input" className="block text-[11px] font-semibold text-ink-soft uppercase tracking-wider mb-1">
                      Display Order
                    </label>
                    <input
                      id="role-order-input"
                      type="number"
                      value={form.displayOrder}
                      onChange={(e) => setForm({ ...form, displayOrder: parseInt(e.target.value) || 0 })}
                      className="w-full rounded-xl border border-line dark:border-gray-700 bg-cream/40 dark:bg-gray-800/80 px-3.5 py-2 text-xs text-ink dark:text-white outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                    />
                  </div>

                  <div className="flex items-center pt-5">
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-ink dark:text-white">
                      <input
                        type="checkbox"
                        checked={form.isActive}
                        onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                        className="rounded border-line text-forest focus:ring-forest h-4 w-4 cursor-pointer"
                      />
                      <span>Active</span>
                    </label>
                  </div>
                </div>

                <div className="pt-2 flex justify-end gap-2 border-t border-line">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowModal(false)}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button
                    id="save-role-btn"
                    type="submit"
                    variant="primary"
                    size="sm"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "Saving..." : editingId ? "Update Role" : "Create Role"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AnimatedPage>
  );
}
