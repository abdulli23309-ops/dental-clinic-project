"use client";

import React, { useEffect, useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Activity,
  BarChart3,
  Bell,
  Calendar,
  CalendarCheck,
  Clock,
  FileText,
  Globe,
  Home,
  Layers,
  MapPin,
  MessageSquare,
  Settings,
  ShieldCheck,
  User,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/components/providers/auth-provider";
import {
  SharedDashboardLayout,
  SidebarLink,
} from "@/components/layout/shared-dashboard-layout";
import { basePathForRole, homePathForRole } from "@/lib/workspace";
import { ErrorBoundary } from "@/components/ui/error-boundary";

const ALL_SIDEBAR_LINKS: SidebarLink[] = [
  { href: "/admin", title: "Overview", icon: Home, exact: true },
  { href: "/admin/appointments", title: "Appointments", icon: Calendar },
  { href: "/admin/my-schedule", title: "My Schedule", icon: CalendarCheck },
  { href: "/admin/reports", title: "Reports & Analytics", icon: BarChart3 },
  { href: "/admin/audit", title: "Audit Trail", icon: Activity },
  { href: "/admin/booking", title: "Booking & Closures", icon: Clock },
  { href: "/admin/messaging", title: "Messaging & Reminders", icon: MessageSquare },
  { href: "/admin/note-templates", title: "Note Templates", icon: FileText },
  { href: "/admin/locations", title: "Clinics & Branches", icon: MapPin },
  { href: "/admin/services", title: "Services & Fees", icon: Layers },
  { href: "/admin/team", title: "Team Members", icon: Users },
  { href: "/admin/roles", title: "Roles", icon: ShieldCheck },
  { href: "/admin/users", title: "Staff Accounts", icon: User },
  { href: "/admin/announcements", title: "Announcements", icon: Bell },
  { href: "/admin/website", title: "Website CMS", icon: Globe },
  { href: "/admin/integrations", title: "API Integrations", icon: ShieldCheck },
  { href: "/admin/settings", title: "Settings", icon: Settings },
  { href: "/admin/account", title: "Account", icon: User },
];

function normalizeAdminPath(pathname: string): string {
  return pathname.replace(/^\/(cleaner|receptionist|doctor|nurse)/, "/admin");
}

function isRouteAllowedForRole(pathname: string, rawRole?: string | null): boolean {
  if (!rawRole) return false;
  const role = rawRole.trim().toLowerCase();
  const normalizedPath = normalizeAdminPath(pathname);

  // Admin / Practice Manager / Platform Owner has full access to all sections
  if (
    role === "admin" ||
    role === "practice manager" ||
    role === "practice_manager" ||
    role === "super admin" ||
    role === "super_admin" ||
    role === "platform owner" ||
    role === "platform_owner" ||
    role === "clinic branch manager" ||
    role === "clinic_branch_manager"
  ) {
    return true;
  }

  // Common shared profile/schedule routes allowed for all staff
  if (
    normalizedPath === "/admin/account" ||
    normalizedPath.startsWith("/admin/account/") ||
    normalizedPath === "/admin/my-schedule" ||
    normalizedPath.startsWith("/admin/my-schedule/") ||
    normalizedPath === "/admin/unauthorized" ||
    normalizedPath.startsWith("/admin/unauthorized/") ||
    pathname === "/unauthorized" ||
    pathname.startsWith("/unauthorized/")
  ) {
    return true;
  }

  // Cleaner / Sterilization Tech: ONLY My Schedule & Account
  if (
    role === "cleaner" ||
    role === "sterilization tech" ||
    role === "sterilization_tech"
  ) {
    return false;
  }

  // Nurse / Dental Assistant: Appointments & My Schedule
  if (
    role === "nurse" ||
    role === "dental assistant" ||
    role === "dental_assistant"
  ) {
    return (
      normalizedPath === "/admin/appointments" ||
      normalizedPath.startsWith("/admin/appointments/")
    );
  }

  // Receptionist: Appointments, Locations, My Schedule
  if (role === "receptionist") {
    return (
      normalizedPath === "/admin/appointments" ||
      normalizedPath.startsWith("/admin/appointments/") ||
      normalizedPath === "/admin/locations" ||
      normalizedPath.startsWith("/admin/locations/")
    );
  }

  // Doctor: Team, Appointments, Note Templates, My Schedule
  if (role === "doctor") {
    return (
      normalizedPath === "/admin/team" ||
      normalizedPath.startsWith("/admin/team/") ||
      normalizedPath === "/admin/appointments" ||
      normalizedPath.startsWith("/admin/appointments/") ||
      normalizedPath === "/admin/note-templates" ||
      normalizedPath.startsWith("/admin/note-templates/")
    );
  }

  return false;
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const role = user?.role ? user.role.trim().toLowerCase() : "";
  const rolePrefix = basePathForRole(user?.role);

  // 1. ROUTE GUARD: Check authorization and enforce redirect
  useEffect(() => {
    if (isLoading || !user) return;

    const isAdminLevel = [
      "admin",
      "practice manager",
      "practice_manager",
      "super admin",
      "super_admin",
      "platform owner",
      "platform_owner",
      "clinic branch manager",
      "clinic_branch_manager",
    ].includes(role);

    // If non-admin hits the root "/admin" overview, redirect to their designated role home
    if (pathname === "/admin" && !isAdminLevel) {
      const dest = homePathForRole(user.role) || "/unauthorized";
      router.replace(dest);
      return;
    }

    // Check path authorization
    if (
      pathname !== "/admin/unauthorized" &&
      pathname !== "/unauthorized" &&
      !isRouteAllowedForRole(pathname, user.role)
    ) {
      toast.error("Access Denied: You do not have permission to view this page.");
      router.replace(`/unauthorized?attempted=${encodeURIComponent(pathname)}`);
    }
  }, [user, isLoading, pathname, role, router]);

  // 2. DYNAMIC SIDEBAR LINKS BASED ON ROLE & URL REWRITES
  const filteredLinks = useMemo(() => {
    if (!user) return ALL_SIDEBAR_LINKS;

    // Cleaner / Sterilization Tech: ONLY My Schedule & Account
    if (
      role === "cleaner" ||
      role === "sterilization tech" ||
      role === "sterilization_tech"
    ) {
      return [
        { href: `${rolePrefix}/my-schedule`, title: "My Schedule", icon: CalendarCheck },
        { href: `${rolePrefix}/account`, title: "Account", icon: User },
      ];
    }

    // Nurse / Dental Assistant: Appointments, My Schedule, Account
    if (
      role === "nurse" ||
      role === "dental assistant" ||
      role === "dental_assistant"
    ) {
      return [
        { href: `${rolePrefix}/appointments`, title: "Appointments", icon: Calendar },
        { href: `${rolePrefix}/my-schedule`, title: "My Schedule", icon: CalendarCheck },
        { href: `${rolePrefix}/account`, title: "Account", icon: User },
      ];
    }

    // Receptionist: Appointments, Locations, My Schedule, Account
    if (role === "receptionist") {
      return [
        { href: `${rolePrefix}/appointments`, title: "Appointments", icon: Calendar },
        { href: `${rolePrefix}/locations`, title: "Clinics & Branches", icon: MapPin },
        { href: `${rolePrefix}/my-schedule`, title: "My Schedule", icon: CalendarCheck },
        { href: `${rolePrefix}/account`, title: "Account", icon: User },
      ];
    }

    // Doctor: Appointments, Team Members, Note Templates, My Schedule, Account
    if (role === "doctor") {
      return [
        { href: `${rolePrefix}/appointments`, title: "Appointments", icon: Calendar },
        { href: `${rolePrefix}/team`, title: "Team Members", icon: Users },
        { href: `${rolePrefix}/note-templates`, title: "Note Templates", icon: FileText },
        { href: `${rolePrefix}/my-schedule`, title: "My Schedule", icon: CalendarCheck },
        { href: `${rolePrefix}/account`, title: "Account", icon: User },
      ];
    }

    // Admin / Practice Manager / Platform Owner: Full Links
    return ALL_SIDEBAR_LINKS;
  }, [role, user, rolePrefix]);

  // 3. DYNAMIC PORTAL LABELS
  const { roleTitle, portalTitle, badgeLabel } = useMemo(() => {
    if (role === "cleaner" || role === "sterilization tech" || role === "sterilization_tech") {
      return {
        roleTitle: "STERILIZATION & FACILITY",
        portalTitle: "STAFF SCHEDULE PORTAL",
        badgeLabel: "Staff",
      };
    }
    if (role === "nurse" || role === "dental assistant" || role === "dental_assistant") {
      return {
        roleTitle: "CLINICAL ASSISTANT",
        portalTitle: "CLINICAL SUPPORT PORTAL",
        badgeLabel: "Nurse",
      };
    }
    if (role === "receptionist") {
      return {
        roleTitle: "FRONT OFFICE",
        portalTitle: "FRONT OFFICE & SCHEDULING PORTAL",
        badgeLabel: "Receptionist",
      };
    }
    if (role === "doctor") {
      return {
        roleTitle: "CLINICAL WORKSPACE",
        portalTitle: "CLINICAL PRACTITIONER PORTAL",
        badgeLabel: "Doctor",
      };
    }
    if (role === "practice manager" || role === "practice_manager") {
      return {
        roleTitle: "PRACTICE MANAGEMENT",
        portalTitle: "ORGANIZATION MANAGEMENT PORTAL",
        badgeLabel: "Manager",
      };
    }
    return {
      roleTitle: "ORGANIZATION CMS",
      portalTitle: "ORGANIZATION MANAGEMENT PORTAL",
      badgeLabel: "Admin",
    };
  }, [role]);

  return (
    <SharedDashboardLayout
      links={filteredLinks}
      roleTitle={roleTitle}
      portalTitle={portalTitle}
      badgeLabel={badgeLabel}
      basePath={rolePrefix}
    >
      <ErrorBoundary fallbackTitle="Workspace Section Error">
        {children}
      </ErrorBoundary>
    </SharedDashboardLayout>
  );
}
