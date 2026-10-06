"use client";

import { useState } from "react";
import { Check, Info, Lock, Shield, ShieldCheck, UserCheck, X } from "lucide-react";
import { Card } from "@/components/ui/card";

interface RoleDef {
  id: string;
  name: string;
  badgeColor: string;
  description: string;
}

const ROLES: RoleDef[] = [
  {
    id: "platform_owner",
    name: "Platform Owner",
    badgeColor: "bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300 border-purple-300",
    description: "Ultimate platform administrator with global root privileges across all clinics and multi-tenant nodes.",
  },
  {
    id: "super_admin",
    name: "Super Admin",
    badgeColor: "bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300 border-indigo-300",
    description: "Organization-wide administrator managing branch directors, global branding, and staff access policies.",
  },
  {
    id: "clinic_branch_manager",
    name: "Clinic Branch Manager",
    badgeColor: "bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300 border-teal-300",
    description: "Operational director for specific clinic branches, managing local practitioner schedules and patient leads.",
  },
  {
    id: "doctor",
    name: "Doctor / Clinician",
    badgeColor: "bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border-emerald-300",
    description: "Licensed dental practitioner with access to assigned operatories, patient history, and slot availability.",
  },
  {
    id: "receptionist",
    name: "Receptionist / Front Desk",
    badgeColor: "bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border-amber-300",
    description: "Front-office staff handling patient check-ins, booking requests, callback queues, and messages.",
  },
];

interface PermissionRow {
  module: string;
  code: string;
  name: string;
  description: string;
  // matrix boolean mapping by role id
  matrix: Record<string, boolean>;
}

const PERMISSIONS_MATRIX: PermissionRow[] = [
  // Appointments & Bookings
  {
    module: "Appointments",
    code: "appointments:view",
    name: "View Appointments",
    description: "Browse appointments and callback requests across assigned branches.",
    matrix: { platform_owner: true, super_admin: true, clinic_branch_manager: true, doctor: true, receptionist: true },
  },
  {
    module: "Appointments",
    code: "appointments:create",
    name: "Create Bookings",
    description: "Manually reserve chairside slots and submit patient appointment requests.",
    matrix: { platform_owner: true, super_admin: true, clinic_branch_manager: true, doctor: true, receptionist: true },
  },
  {
    module: "Appointments",
    code: "appointments:reschedule",
    name: "Reschedule / Modify",
    description: "Change booking date, operatory slot, or assigned practitioner.",
    matrix: { platform_owner: true, super_admin: true, clinic_branch_manager: true, doctor: true, receptionist: true },
  },
  {
    module: "Appointments",
    code: "appointments:cancel",
    name: "Cancel / Void",
    description: "Cancel appointments and release booked slots back into available pool.",
    matrix: { platform_owner: true, super_admin: true, clinic_branch_manager: true, doctor: true, receptionist: false },
  },

  // Patients
  {
    module: "Patients",
    code: "patients:view_directory",
    name: "View Patient Directory",
    description: "Access contact information, appointment history, and registration details.",
    matrix: { platform_owner: true, super_admin: true, clinic_branch_manager: true, doctor: true, receptionist: true },
  },
  {
    module: "Patients",
    code: "patients:clinical_notes",
    name: "Manage Clinical Notes",
    description: "Author and review confidential dental examination charts and clinical records.",
    matrix: { platform_owner: true, super_admin: true, clinic_branch_manager: false, doctor: true, receptionist: false },
  },

  // Clinics & Branches
  {
    module: "Clinics",
    code: "clinics:manage",
    name: "Manage Branch Clinics",
    description: "Add, edit, or toggle physical clinic locations, addresses, and hours.",
    matrix: { platform_owner: true, super_admin: true, clinic_branch_manager: false, doctor: false, receptionist: false },
  },
  {
    module: "Clinics",
    code: "theming:customize",
    name: "Customize Brand Theming",
    description: "Modify organization visual colors, typography, and website palette.",
    matrix: { platform_owner: true, super_admin: true, clinic_branch_manager: false, doctor: false, receptionist: false },
  },

  // Practitioners & Staff
  {
    module: "Staff",
    code: "team:manage",
    name: "Manage Staff & Doctors",
    description: "Create profiles, update bios, credentials, and clinic branch assignments.",
    matrix: { platform_owner: true, super_admin: true, clinic_branch_manager: true, doctor: false, receptionist: false },
  },
  {
    module: "Staff",
    code: "slots:configure",
    name: "Operatory Slot Allocation",
    description: "Open and close calendar booking availability for clinicians.",
    matrix: { platform_owner: true, super_admin: true, clinic_branch_manager: true, doctor: true, receptionist: false },
  },

  // Marketing & Announcements
  {
    module: "CMS",
    code: "announcements:crud",
    name: "Marquee Announcements",
    description: "Publish ticker announcements, promotion alerts, and clinic notices.",
    matrix: { platform_owner: true, super_admin: true, clinic_branch_manager: true, doctor: false, receptionist: false },
  },
  {
    module: "CMS",
    code: "cms:edit",
    name: "Website Content Editor",
    description: "Edit hero copy, FAQ items, and clinical service pricing schedules.",
    matrix: { platform_owner: true, super_admin: true, clinic_branch_manager: false, doctor: false, receptionist: false },
  },

  // System & Security
  {
    module: "Security",
    code: "security:audit_logs",
    name: "View Security Audit Trail",
    description: "Inspect immutable activity logs, IP tracking, and session revocations.",
    matrix: { platform_owner: true, super_admin: true, clinic_branch_manager: false, doctor: false, receptionist: false },
  },
  {
    module: "Security",
    code: "security:revoke_sessions",
    name: "Revoke Active Sessions",
    description: "Force logout of workstations or invalidate user refresh tokens.",
    matrix: { platform_owner: true, super_admin: true, clinic_branch_manager: false, doctor: false, receptionist: false },
  },
];

export default function AdminPermissionsPage() {
  const [selectedRole, setSelectedRole] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredPermissions = PERMISSIONS_MATRIX.filter((item) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match =
        item.name.toLowerCase().includes(q) ||
        item.code.toLowerCase().includes(q) ||
        item.module.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="border-b border-line pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="eyebrow mb-1">Access Control &amp; RBAC</p>
          <h1 className="text-2xl sm:text-3xl font-display text-ink font-semibold">
            Role &amp; Permissions Matrix
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-ink-soft">
            Visual architectural map of the 5 platform roles and functional capability boundaries.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="rounded-xl border border-line bg-cream px-3 py-1.5 text-xs text-ink-soft flex items-center gap-2">
            <Lock className="h-3.5 w-3.5 text-forest" />
            <span className="font-mono uppercase font-bold text-[11px] text-ink">5 Active Platform Roles</span>
          </div>
        </div>
      </div>

      {/* Role Summary Badges */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {ROLES.map((r) => (
          <Card
            key={r.id}
            surface="cream"
            shadow="card"
            className={`p-4 transition-all cursor-pointer ${
              selectedRole === r.id ? "ring-2 ring-forest" : "hover:border-forest/50"
            }`}
            onClick={() => setSelectedRole(selectedRole === r.id ? "all" : r.id)}
          >
            <div className="flex items-center justify-between mb-2">
              <span className={`text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded-full border ${r.badgeColor}`}>
                Role
              </span>
              <ShieldCheck className="h-3.5 w-3.5 text-forest opacity-70" />
            </div>
            <h3 className="text-xs font-bold text-ink mb-1 truncate">{r.name}</h3>
            <p className="text-[11px] text-ink-soft line-clamp-3 leading-snug">
              {r.description}
            </p>
          </Card>
        ))}
      </div>

      {/* Role Filter & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-sand/30 p-3 rounded-2xl border border-line">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <button
            onClick={() => setSelectedRole("all")}
            className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              selectedRole === "all"
                ? "bg-forest text-white"
                : "bg-white/80 dark:bg-black/30 text-ink-soft hover:text-ink"
            }`}
          >
            All Roles Matrix
          </button>
          {ROLES.map((r) => (
            <button
              key={r.id}
              onClick={() => setSelectedRole(r.id)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                selectedRole === r.id
                  ? "bg-forest text-white"
                  : "bg-white/80 dark:bg-black/30 text-ink-soft hover:text-ink"
              }`}
            >
              {r.name}
            </button>
          ))}
        </div>

        <input
          type="text"
          placeholder="Filter permissions..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="rounded-lg border border-line bg-white dark:bg-black/20 px-3 py-1.5 text-xs text-ink w-full sm:w-64"
        />
      </div>

      {/* Permissions Matrix Table */}
      <Card surface="cream" shadow="card" className="overflow-hidden border border-line">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-line bg-sand/40">
                <th className="py-3 px-4 font-semibold text-ink uppercase tracking-wider text-[11px]">
                  Capability / Code
                </th>
                <th className="py-3 px-4 font-semibold text-ink uppercase tracking-wider text-[11px] hidden md:table-cell">
                  Module
                </th>
                {ROLES.filter((r) => selectedRole === "all" || selectedRole === r.id).map((r) => (
                  <th
                    key={r.id}
                    className="py-3 px-4 font-semibold text-ink uppercase tracking-wider text-[11px] text-center"
                  >
                    {r.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line/60">
              {filteredPermissions.map((item) => (
                <tr key={item.code} className="hover:bg-sand/30 transition-colors">
                  <td className="py-3 px-4">
                    <p className="font-semibold text-ink text-xs">{item.name}</p>
                    <p className="text-[11px] text-ink-soft">{item.description}</p>
                    <code className="text-[10px] font-mono text-forest/80 dark:text-emerald-400 mt-0.5 block">
                      {item.code}
                    </code>
                  </td>
                  <td className="py-3 px-4 hidden md:table-cell">
                    <span className="rounded-full bg-forest/10 px-2 py-0.5 text-[10px] font-mono font-semibold text-forest">
                      {item.module}
                    </span>
                  </td>
                  {ROLES.filter((r) => selectedRole === "all" || selectedRole === r.id).map((r) => {
                    const hasAccess = item.matrix[r.id];
                    return (
                      <td key={r.id} className="py-3 px-4 text-center">
                        {hasAccess ? (
                          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                            <Check className="h-3.5 w-3.5 stroke-[2.5]" />
                          </span>
                        ) : (
                          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-sand/60 text-ink-soft/40">
                            <X className="h-3.5 w-3.5" />
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
