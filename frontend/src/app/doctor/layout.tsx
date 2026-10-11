"use client";

import React from "react";
import {
  Calendar,
  ListTodo,
  Mail,
  Users,
} from "lucide-react";

import {
  SharedDashboardLayout,
  SidebarLink,
} from "@/components/layout/shared-dashboard-layout";

const DOCTOR_LINKS: SidebarLink[] = [
  { href: "/doctor", title: "Daily Schedule", icon: Calendar, exact: true },
  { href: "/doctor/patients", title: "Patients", icon: Users },
];

export default function DoctorLayout({ children }: { children: React.ReactNode }) {
  return (
    <SharedDashboardLayout
      links={DOCTOR_LINKS}
      roleTitle="Practitioner Portal"
      portalTitle="Clinical Workspace"
      badgeLabel="Doctor"
      basePath="/doctor"
    >
      {children}
    </SharedDashboardLayout>
  );
}
