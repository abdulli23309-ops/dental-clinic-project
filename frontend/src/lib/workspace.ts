/**
 * Workspace (role-based routing) resolution: Marlow Dental staff portal.
 *
 * Single source of truth for mapping an authenticated user's backend role to
 * the staff workspace they are allowed to reach. Mirrors the backend
 * authorization rules in `backend/app/api/deps.py`:
 *
 *   require_admin        = admin | Platform Owner | Super Admin | Practice Manager
 *   require_receptionist = receptionist | Receptionist | admin | Admin |
 *                          Super Admin | Clinic Branch Manager
 *   require_doctor       = doctor | Doctor | admin | Admin | Super Admin
 *
 * Backend role comparison is case-insensitive, so this module normalizes the
 * same way (trim + lowercase) before matching. Never hardcode role checks in
 * components: always go through this file.
 */

export type WorkspaceKey = "admin" | "reception" | "doctor" | "cleaner" | "nurse" | "receptionist";

export interface WorkspaceMeta {
  /** Route segment prefix, e.g. "/admin". */
  basePath: string;
  /** Short badge shown in the header / sidebar. */
  badge: string;
  /** Role label shown in the sidebar footer. */
  roleLabel: string;
  /** Descriptor shown in the desktop header. */
  portalTitle: string;
  /** Loading copy while the session is being verified. */
  verifyingCopy: string;
}

export const WORKSPACES: Record<string, WorkspaceMeta> = {
  admin: {
    basePath: "/admin",
    badge: "Admin",
    roleLabel: "Administration",
    portalTitle: "Practice Administration",
    verifyingCopy: "Verifying administrator session...",
  },
  receptionist: {
    basePath: "/receptionist",
    badge: "Front Office",
    roleLabel: "Front Office",
    portalTitle: "Front-Office Operations",
    verifyingCopy: "Verifying receptionist session...",
  },
  reception: {
    basePath: "/reception",
    badge: "Front Office",
    roleLabel: "Front Office",
    portalTitle: "Front-Office Operations",
    verifyingCopy: "Verifying front-office session...",
  },
  doctor: {
    basePath: "/doctor",
    badge: "Doctor",
    roleLabel: "Practitioner",
    portalTitle: "Clinical Workspace",
    verifyingCopy: "Verifying practitioner session...",
  },
  nurse: {
    basePath: "/nurse",
    badge: "Clinical Care",
    roleLabel: "Dental Nurse",
    portalTitle: "Clinical Support Operations",
    verifyingCopy: "Verifying nursing session...",
  },
  cleaner: {
    basePath: "/cleaner",
    badge: "Facilities",
    roleLabel: "Sanitation & Sterilization",
    portalTitle: "Facility Operations",
    verifyingCopy: "Verifying facility session...",
  },
};

/**
 * Maps a raw backend role value onto its workspace, case-insensitively.
 * Returns null when the account has no staff workspace (e.g. "patient").
 */
export function workspaceForRole(role: string | null | undefined): WorkspaceKey | null {
  if (!role) return null;
  const normalized = role.trim().toLowerCase();

  switch (normalized) {
    case "cleaner":
    case "sterilization tech":
    case "sterilization_tech":
      return "cleaner";
    case "nurse":
    case "dental assistant":
    case "dental_assistant":
      return "nurse";
    case "doctor":
      return "doctor";
    case "receptionist":
    case "reception":
    case "front_desk":
    case "front desk":
      return "receptionist";
    case "admin":
    case "super admin":
    case "super_admin":
    case "platform owner":
    case "platform_owner":
    case "practice manager":
    case "practice_manager":
    case "clinic branch manager":
    case "clinic_branch_manager":
      return "admin";
    default:
      return null;
  }
}

/** Workspace the signed-in user should land on after login (or null if none). */
export function homePathForRole(role: string | null | undefined): string | null {
  if (!role) return null;
  const normalized = role.trim().toLowerCase();

  switch (normalized) {
    case "cleaner":
    case "sterilization tech":
    case "sterilization_tech":
      return "/cleaner/my-schedule";
    case "nurse":
    case "dental assistant":
    case "dental_assistant":
      return "/nurse/appointments";
    case "doctor":
      return "/doctor/appointments";
    case "receptionist":
    case "reception":
    case "front_desk":
    case "front desk":
      return "/receptionist/appointments";
    case "admin":
    case "super admin":
    case "super_admin":
    case "platform owner":
    case "platform_owner":
    case "practice manager":
    case "practice_manager":
    case "clinic branch manager":
    case "clinic_branch_manager":
      return "/admin";
    default:
      return "/admin";
  }
}

/**
 * Returns the URL route prefix for a given role (e.g. /receptionist, /doctor, /cleaner, /nurse, /admin).
 */
export function basePathForRole(role: string | null | undefined): string {
  if (!role) return "/admin";
  const normalized = role.trim().toLowerCase();
  switch (normalized) {
    case "cleaner":
    case "sterilization tech":
    case "sterilization_tech":
      return "/cleaner";
    case "nurse":
    case "dental assistant":
    case "dental_assistant":
      return "/nurse";
    case "doctor":
      return "/doctor";
    case "receptionist":
    case "reception":
    case "front_desk":
    case "front desk":
      return "/receptionist";
    default:
      return "/admin";
  }
}

/**
 * Which workspaces a role may open. Matches backend `require_*` dependencies
 * exactly, so a user can never reach a workspace the API would reject.
 */
export function canAccessWorkspace(role: string | null | undefined, workspace: WorkspaceKey | string): boolean {
  if (!role) return false;
  const normalized = role.trim().toLowerCase();
  const isStaffRole = [
    "admin",
    "super admin",
    "super_admin",
    "platform owner",
    "platform_owner",
    "practice manager",
    "practice_manager",
    "clinic branch manager",
    "clinic_branch_manager",
    "doctor",
    "receptionist",
    "reception",
    "front_desk",
    "front desk",
    "nurse",
    "dental assistant",
    "dental_assistant",
    "cleaner",
    "sterilization tech",
    "sterilization_tech",
  ].includes(normalized);

  const isAdminLevel = [
    "admin",
    "super admin",
    "super_admin",
    "platform owner",
    "platform_owner",
    "practice manager",
    "practice_manager",
    "clinic branch manager",
    "clinic_branch_manager",
  ].includes(normalized);

  switch (workspace) {
    case "admin":
      return isStaffRole;
    case "reception":
    case "receptionist":
      return isStaffRole;
    case "doctor":
      return isAdminLevel || normalized === "doctor" || normalized === "nurse" || normalized === "dental assistant";
    case "nurse":
      return isAdminLevel || normalized === "nurse" || normalized === "dental assistant" || normalized === "dental_assistant";
    case "cleaner":
      return isAdminLevel || normalized === "cleaner" || normalized === "sterilization tech" || normalized === "sterilization_tech";
    default:
      return false;
  }
}
