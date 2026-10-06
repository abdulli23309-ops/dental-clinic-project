"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Globe,
  Home,
  Layers,
  LogOut,
  MapPin,
  Menu,
  Settings,
  ShieldCheck,
  UserCheck,
  Users,
  X,
} from "lucide-react";

import { useAuth } from "@/components/providers/auth-provider";
import { ThemeToggle } from "@/components/ui/theme-toggle";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  exact?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/admin", label: "Overview", icon: Home, exact: true },
  { href: "/admin/locations", label: "Clinics & Branches", icon: MapPin },
  { href: "/admin/services", label: "Services & Fees", icon: Layers },
  { href: "/admin/team", label: "Team Members", icon: Users },
  { href: "/admin/announcements", label: "Announcements", icon: Bell },
  { href: "/admin/website", label: "Website CMS", icon: Globe },
  { href: "/admin/permissions", label: "Role Permissions", icon: ShieldCheck },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoading, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login");
    }
  }, [user, isLoading, router]);

  // Close mobile drawer on route transition
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-bone flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-forest border-t-transparent" />
          <p className="text-xs font-mono uppercase tracking-wider text-ink-soft">
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
    <div className="min-h-screen bg-bone flex flex-col md:flex-row">
      {/* Mobile Top App Bar */}
      <div className="md:hidden sticky top-0 z-40 flex items-center justify-between border-b border-line bg-cream/95 px-4 py-3 backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setMobileOpen(true)}
            className="p-1.5 rounded-lg border border-line text-ink hover:bg-sand/60"
            aria-label="Open navigation sidebar"
          >
            <Menu className="h-5 w-5" />
          </button>
          <span className="font-display font-semibold text-ink text-base tracking-tight">
            Marlow Dental
          </span>
          <span className="rounded-full bg-forest/10 px-2 py-0.5 text-[10px] font-mono uppercase font-bold text-forest">
            Admin
          </span>
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button
            onClick={() => logout()}
            title="Sign out"
            className="p-1.5 rounded-full border border-line text-ink-soft hover:text-red-600"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Mobile Drawer Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Floating Pill Left Sidebar (Desktop + Mobile Drawer) */}
      <aside
        className={`fixed md:sticky top-4 z-50 md:z-30 h-[calc(100vh-2rem)] shrink-0 my-4 ml-4 flex flex-col justify-between bg-white border border-gray-100 rounded-3xl shadow-xl transition-all duration-300 ease-in-out ${
          mobileOpen ? "left-4 w-64" : "-left-80 md:left-4"
        } ${collapsed ? "md:w-20" : "w-64 md:w-64"}`}
      >
        {/* Top: Brand Header */}
        <div className={`p-4 border-b border-gray-100 flex items-center ${collapsed ? "justify-center" : "justify-between"}`}>
          <Link href="/admin" className="flex items-center gap-3 overflow-hidden" title="Marlow Dental CMS">
            <div className="h-10 w-10 shrink-0 rounded-2xl bg-primary text-white grid place-items-center font-display font-bold text-lg shadow-md transition-transform hover:scale-105">
              M
            </div>
            {!collapsed && (
              <div className="truncate">
                <span className="font-display text-sm font-bold text-gray-900 block leading-tight tracking-tight">
                  Marlow Dental
                </span>
                <span className="text-[10px] font-mono text-gray-500 block uppercase tracking-wider">
                  Organization CMS
                </span>
              </div>
            )}
          </Link>

          {/* Close button on mobile */}
          <button
            onClick={() => setMobileOpen(false)}
            className="md:hidden p-1.5 rounded-xl text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors"
            aria-label="Close sidebar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Center: Navigation Links */}
        <nav className={`flex-1 overflow-y-auto p-3 space-y-2 scrollbar-none ${collapsed ? "flex flex-col items-center" : ""}`}>
          {NAV_ITEMS.map((item) => {
            const isActive = item.exact
              ? pathname === item.href
              : pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                title={item.label}
                className={`flex items-center rounded-full text-xs font-medium transition-all duration-300 ease-in-out ${
                  collapsed
                    ? "h-11 w-11 justify-center p-0"
                    : "gap-3.5 px-4 py-3 w-full"
                } ${
                  isActive
                    ? "bg-primary text-white shadow-md font-semibold"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                }`}
              >
                <Icon className={`h-4 w-4 shrink-0 transition-colors ${isActive ? "text-white" : "text-primary"}`} />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Bottom: User Info & Controls */}
        <div className="p-3.5 border-t border-gray-100 space-y-2 bg-gray-50/60 rounded-b-3xl">
          <div
            title={`${user.fullName} (${user.role})`}
            className={`flex items-center rounded-2xl bg-white border border-gray-100 shadow-xs ${
              collapsed ? "p-1.5 justify-center" : "gap-2.5 p-2.5"
            }`}
          >
            <div className="h-9 w-9 shrink-0 rounded-full bg-primary/10 text-primary grid place-items-center text-xs font-bold">
              {user.fullName.slice(0, 2).toUpperCase()}
            </div>
            {!collapsed && (
              <div className="truncate flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-900 truncate leading-tight">
                  {user.fullName}
                </p>
                <p className="text-[10px] text-primary truncate uppercase font-mono tracking-wider font-semibold">
                  {user.role}
                </p>
              </div>
            )}
          </div>

          <div className={`flex items-center ${collapsed ? "flex-col gap-2 pt-1" : "justify-between pt-1"}`}>
            {/* Collapse toggle (desktop only) */}
            <button
              onClick={() => setCollapsed(!collapsed)}
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              className="hidden md:inline-flex p-2 rounded-full border border-gray-200 text-gray-600 hover:text-gray-900 hover:bg-white shadow-xs transition-colors"
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </button>

            {!collapsed && (
              <Link
                href="/"
                target="_blank"
                title="View live website"
                className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-900 px-3 py-1.5 rounded-full hover:bg-white shadow-xs transition-colors"
              >
                <span>Live Site</span>
                <ExternalLink className="h-3 w-3" />
              </Link>
            )}

            <button
              onClick={() => logout()}
              title="Sign out"
              className="p-2 rounded-full border border-gray-200 text-gray-500 hover:text-red-600 hover:bg-red-50 shadow-xs transition-colors"
              aria-label="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Admin Content Workspace */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Desktop Sticky Header */}
        <header className="hidden md:flex sticky top-0 z-20 h-14 items-center justify-between border-b border-line bg-cream/80 px-8 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono uppercase tracking-wider text-ink-soft">
              Organization Management Portal
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/"
              target="_blank"
              className="inline-flex items-center gap-1.5 rounded-full border border-line bg-sand/40 px-3 py-1 text-xs text-ink-soft hover:text-ink transition-colors"
            >
              <span>View Live Website</span>
              <ExternalLink className="h-3 w-3" />
            </Link>
            <ThemeToggle />
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 md:p-8 max-w-7xl mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  );
}
