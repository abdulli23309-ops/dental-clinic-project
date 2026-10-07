"use client";

import { useEffect, useState } from "react";
import { Check, Info, Lock, Save, Shield, ShieldCheck, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/components/providers/auth-provider";
import {
  adminGetPermissions,
  adminUpdatePermissions,
  PermissionMatrixItem,
  PermissionsMatrixData,
} from "@/lib/api";

const ROLES = ["Patient", "Receptionist", "Doctor", "Admin"];

const ROLE_METADATA: Record<string, { badge: string; description: string }> = {
  Patient: {
    badge: "bg-blue-100 text-blue-800 border-blue-200",
    description: "Self-service booking, personal profile management, and appointment history.",
  },
  Receptionist: {
    badge: "bg-amber-100 text-amber-800 border-amber-200",
    description: "Front-desk check-in, phone triage, lead management, and patient registration.",
  },
  Doctor: {
    badge: "bg-emerald-100 text-emerald-800 border-emerald-200",
    description: "Licensed dental practitioners accessing operatory schedules, charts, and treatment records.",
  },
  Admin: {
    badge: "bg-purple-100 text-purple-800 border-purple-200",
    description: "Full administrative authority across clinics, staff, billing, theming, and system settings.",
  },
};

export default function AdminPermissionsPage() {
  const { accessToken } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const [permissions, setPermissions] = useState<PermissionMatrixItem[]>([]);
  const [matrix, setMatrix] = useState<Record<string, string[]>>({
    Patient: [],
    Receptionist: [],
    Doctor: [],
    Admin: [],
  });

  const [searchQuery, setSearchQuery] = useState("");

  const loadMatrix = async () => {
    setLoading(true);
    setError("");
    try {
      const data: PermissionsMatrixData = await adminGetPermissions(accessToken);
      setPermissions(data.permissions);
      setMatrix(data.matrix);
    } catch (err: any) {
      setError(err.message || "Failed to load permissions matrix.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMatrix();
  }, [accessToken]);

  const handleToggle = (role: string, permCode: string) => {
    setMatrix((prev) => {
      const currentList = prev[role] || [];
      const isAssigned = currentList.includes(permCode);
      const updatedList = isAssigned
        ? currentList.filter((c) => c !== permCode)
        : [...currentList, permCode];

      return {
        ...prev,
        [role]: updatedList,
      };
    });
    setSuccess(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");
    setSuccess(false);
    try {
      const updated = await adminUpdatePermissions(matrix, accessToken);
      setMatrix(updated.matrix);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3500);
    } catch (err: any) {
      setError(err.message || "Failed to save permissions.");
    } finally {
      setSaving(false);
    }
  };

  const filteredPermissions = permissions.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.module.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Page Title & Save Action */}
      <div className="border-b border-line pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="eyebrow mb-1">Access Control &amp; Security</p>
          <h1 className="text-2xl sm:text-3xl font-display text-ink font-semibold">
            Role &amp; Permissions Assignment Matrix
          </h1>
          <p className="text-xs text-ink-soft mt-1">
            Configure granular access privileges across the 4 primary platform roles. Changes sync to the database.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={handleSave}
            disabled={saving || loading}
            variant="primary"
            size="sm"
            className="flex items-center gap-2"
          >
            <Save className="h-4 w-4" />
            <span>{saving ? "Saving..." : "Save Matrix Changes"}</span>
          </Button>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-3.5 text-xs text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3.5 text-xs text-emerald-800 flex items-center gap-2">
          <Check className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>Role permissions matrix successfully saved and synced to the database!</span>
        </div>
      )}

      {/* Role Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {ROLES.map((role) => {
          const meta = ROLE_METADATA[role] || {
            badge: "bg-gray-100 text-gray-800 border-gray-200",
            description: "Platform role",
          };
          const assignedCount = matrix[role]?.length || 0;

          return (
            <Card key={role} surface="cream" shadow="subtle" className="p-4 rounded-2xl border border-line">
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className={`px-2.5 py-0.5 rounded-full text-[10.5px] font-mono font-bold uppercase border ${meta.badge}`}>
                  {role}
                </span>
                <span className="text-[11px] font-mono text-ink-soft">
                  {assignedCount} / {permissions.length} active
                </span>
              </div>
              <p className="text-xs text-ink-soft leading-relaxed line-clamp-2">
                {meta.description}
              </p>
            </Card>
          );
        })}
      </div>

      {/* Filter and Table Container */}
      <Card surface="bone" shadow="card" className="rounded-2xl border border-line p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-ink-soft font-mono">
            <ShieldCheck className="h-4 w-4 text-forest" />
            <span>Interactive Assignment Grid ({permissions.length} Capabilities)</span>
          </div>

          <input
            type="text"
            placeholder="Search permissions or modules..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="rounded-lg border border-line bg-cream px-3 py-1.5 text-xs text-ink placeholder:text-ink-soft/60 focus:outline-none focus:ring-1 focus:ring-forest w-full sm:w-64"
          />
        </div>

        {loading ? (
          <div className="py-16 text-center text-xs text-ink-soft font-mono">
            Loading permissions matrix from database...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-line bg-cream/70 text-[11px] font-mono uppercase tracking-wider text-ink-soft">
                  <th className="py-3 px-4 font-semibold w-1/3">Permission Capability</th>
                  <th className="py-3 px-4 font-semibold">Module</th>
                  {ROLES.map((role) => (
                    <th key={role} className="py-3 px-4 text-center font-semibold">
                      {role}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line/60 text-xs">
                {filteredPermissions.map((perm) => {
                  return (
                    <tr key={perm.code} className="hover:bg-sand/20 transition-colors">
                      <td className="py-3.5 px-4 align-top">
                        <div className="font-medium text-ink">{perm.name}</div>
                        <div className="text-[11px] text-ink-soft mt-0.5 leading-tight">
                          {perm.description}
                        </div>
                        <code className="text-[9.5px] font-mono text-ink-soft/70 block mt-1">
                          {perm.code}
                        </code>
                      </td>

                      <td className="py-3.5 px-4 align-top">
                        <span className="rounded-md bg-sand/60 px-2 py-0.5 text-[10px] font-mono text-ink font-medium">
                          {perm.module}
                        </span>
                      </td>

                      {ROLES.map((role) => {
                        const isChecked = (matrix[role] || []).includes(perm.code);
                        return (
                          <td key={role} className="py-3.5 px-4 text-center align-middle">
                            <label className="inline-flex items-center justify-center cursor-pointer p-1">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => handleToggle(role, perm.code)}
                                className="h-4 w-4 rounded border-line text-forest focus:ring-forest cursor-pointer accent-[#1F3D34]"
                              />
                            </label>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
