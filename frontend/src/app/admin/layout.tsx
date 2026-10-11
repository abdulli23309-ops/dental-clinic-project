"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  Globe,
  Home,
  Layers,
  MapPin,
  Settings,
  ShieldCheck,
  Users,
} from "lucide-react";

import { useAuth } from "@/components/providers/auth-provider";
import { DashboardSidebar, SidebarLink } from "@/components/layout/dashboard-sidebar";
import { DashboardHeader } from "@/components/layout/dashboard-header";

const NAV_ITEMS: SidebarLink[] = [
  { href: "/admin", title: "Overview", icon: Home, exact: true },
  { href: "/admin/locations", title: "Clinics & Branches", icon: MapPin },
  { href: "/admin/services", title: "Services & Fees", icon: Layers },
  { href: "/admin/team", title: "Team Members", icon: Users },
  { href: "/admin/announcements", title: "Announcements", icon: Bell },
  { href: "/admin/website", title: "Website CMS", icon: Globe },
  { href: "/admin/permissions", title: "Role Permissions", icon: ShieldCheck },
  { href: "/admin/settings", title: "Settings", icon: Settings },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login");
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-xs font-mono uppercase tracking-wider text-gray-500 dark:text-gray-400">
            Verifying staff credentials...
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col md:flex-row">
      <DashboardHeader
        portalTitle="Organization Management Portal"
        badgeLabel="Admin"
        onMobileMenuOpen={() => setMobileOpen(true)}
      />

      {/* Mobile Drawer Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Reusable Floating Pill Sidebar */}
      <DashboardSidebar
        links={NAV_ITEMS}
        basePath="/admin"
        roleLabel="Organization CMS"
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />

      {/* Main Admin Content Workspace */}
      <div className="flex-1 flex flex-col min-w-0">
        <main className="flex-1 p-4 sm:p-6 md:p-8 max-w-7xl mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  );
}
