"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Activity,
  AlertCircle,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  ExternalLink,
  FileCheck,
  Inbox,
  Layers,
  ListTodo,
  LogOut,
  Mail,
  Menu,
  PhoneCall,
  Search,
  ShieldCheck,
  UserCheck,
  Users,
  UserX,
  X,
  Zap,
} from "lucide-react";

import { useAuth } from "@/components/providers/auth-provider";
import { ThemeToggle } from "@/components/ui/theme-toggle";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  exact?: boolean;
  badge?: string;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/reception", label: "Dashboard", icon: Activity, exact: true },
  { href: "/reception/schedule", label: "Schedule", icon: Calendar },
  { href: "/reception/appointments", label: "Appointments", icon: Clock },
  { href: "/reception/appointments/requests", label: "Requests", icon: Inbox },
  { href: "/reception/appointments/confirmations", label: "Confirmations", icon: FileCheck },
  { href: "/reception/check-in", label: "Check-In / Flow", icon: UserCheck },
  { href: "/reception/patients", label: "Patients", icon: Users },
  { href: "/reception/tasks", label: "Tasks", icon: ListTodo },
  { href: "/reception/messages", label: "Messages", icon: Mail },
  { href: "/reception/recalls", label: "Recalls", icon: PhoneCall },
  { href: "/reception/waitlist", label: "Waitlist / ASAP", icon: Zap },
  { href: "/reception/leads", label: "Leads", icon: UserX },
  { href: "/reception/account", label: "Account", icon: ShieldCheck },
];

export default function ReceptionLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoading, logout } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login");
    }
  }, [user, isLoading, router]);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-xs font-mono uppercase tracking-wider text-gray-500 dark:text-gray-400">
            Verifying front-office session...
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // Access check: Only receptionist, admin, and doctor can access reception
  const isAuthorized = user.role === "receptionist" || user.role === "admin";

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-6">
        <div className="max-w-md w-full p-8 rounded-2xl bg-white dark:bg-gray-900 border border-red-200 dark:border-red-900 shadow-xl text-center space-y-4">
          <div className="inline-flex p-3 rounded-full bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400">
            <AlertCircle className="h-8 w-8" />
          </div>
          <h2 className="text-xl font-display font-semibold text-gray-900 dark:text-white">
            Access Restricted
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Your user account is assigned the <strong>{user.role}</strong> role. This workspace requires Front-Desk Receptionist privileges.
          </p>
          <div className="pt-2 flex justify-center gap-3">
            {user.role === "doctor" && (
              <Link
                href="/doctor"
                className="px-4 py-2 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary/90"
              >
                Go to Doctor Workspace
              </Link>
            )}
            {user.role === "admin" && (
              <Link
                href="/admin"
                className="px-4 py-2 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary/90"
              >
                Go to Admin CMS
              </Link>
            )}
            <button
              onClick={() => logout()}
              className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-800 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col md:flex-row">
      {/* Mobile Top App Bar */}
      <div className="md:hidden sticky top-0 z-40 flex items-center justify-between border-b border-gray-200 dark:border-gray-800 bg-white/95 dark:bg-gray-950/95 px-4 py-3 backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setMobileOpen(true)}
            className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800"
            aria-label="Open navigation sidebar"
          >
            <Menu className="h-5 w-5" />
          </button>
          <span className="font-display font-semibold text-gray-900 dark:text-gray-100 text-base tracking-tight">
            Marlow Dental
          </span>
          <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-mono uppercase font-bold text-emerald-600 dark:text-emerald-400">
            Front Office
          </span>
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button
            onClick={() => logout()}
            title="Sign out"
            className="p-1.5 rounded-full border border-gray-200 dark:border-gray-800 text-gray-500 dark:text-gray-400 hover:text-red-600"
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

      {/* Sidebar Navigation */}
      <aside
        className={`
          fixed md:sticky top-0 z-50 md:z-30 h-screen flex flex-col justify-between
          border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950
          transition-all duration-300 ease-in-out
          ${isCollapsed ? "md:w-20" : "md:w-64"}
          ${mobileOpen ? "translate-x-0 w-72" : "-translate-x-full md:translate-x-0"}
        `}
      >
        {/* Top Practice Branding */}
        <div>
          <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-900">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-600 text-white shadow-md font-display font-bold text-lg">
                M
              </div>
              {(!isCollapsed || mobileOpen) && (
                <div className="flex flex-col truncate">
                  <span className="font-display font-bold text-gray-900 dark:text-white text-sm tracking-tight leading-none truncate">
                    Marlow Dental
                  </span>
                  <span className="text-[11px] font-mono uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mt-1">
                    Front Office Command
                  </span>
                </div>
              )}
            </div>

            {/* Mobile Close Button */}
            <button
              onClick={() => setMobileOpen(false)}
              className="md:hidden p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Quick Clinic Context Tag */}
          {(!isCollapsed || mobileOpen) && (
            <div className="mx-3 mt-3 px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-[11px] flex items-center justify-between">
              <span className="text-gray-500 dark:text-gray-400 font-medium">Clinic Scope</span>
              <span className="font-mono font-semibold text-gray-900 dark:text-gray-200">Main Practice</span>
            </div>
          )}

          {/* Navigation Links */}
          <nav className="p-3 space-y-1 overflow-y-auto max-h-[calc(100vh-250px)]">
            {NAV_ITEMS.map((item) => {
              const isActive = item.exact
                ? pathname === item.href
                : pathname.startsWith(item.href);
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={isCollapsed ? item.label : undefined}
                  className={`
                    flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all
                    ${
                      isActive
                        ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-semibold shadow-xs"
                        : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-900 hover:text-gray-900 dark:hover:text-white"
                    }
                    ${isCollapsed && !mobileOpen ? "justify-center" : ""}
                  `}
                >
                  <Icon className={`h-4 w-4 shrink-0 ${isActive ? "text-emerald-600 dark:text-emerald-400" : ""}`} />
                  {(!isCollapsed || mobileOpen) && (
                    <span className="truncate flex-1">{item.label}</span>
                  )}
                  {(!isCollapsed || mobileOpen) && item.badge && (
                    <span className="rounded-full bg-emerald-100 dark:bg-emerald-950 px-1.5 py-0.5 text-[10px] font-mono font-semibold text-emerald-700 dark:text-emerald-300">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Footer with Staff Info, Theme & Sign Out */}
        <div className="p-3 border-t border-gray-100 dark:border-gray-900 space-y-2">
          {(!isCollapsed || mobileOpen) && (
            <div className="px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-900/60 border border-gray-200/60 dark:border-gray-800 flex items-center justify-between">
              <div className="truncate">
                <p className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate">
                  {user.fullName || user.email}
                </p>
                <p className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 capitalize">
                  {user.role}
                </p>
              </div>
              <ThemeToggle />
            </div>
          )}

          <div className="flex items-center justify-between gap-1">
            <button
              onClick={() => logout()}
              title="Sign Out"
              className={`
                flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors
                ${isCollapsed && !mobileOpen ? "w-full justify-center" : "flex-1"}
              `}
            >
              <LogOut className="h-4 w-4 shrink-0" />
              {(!isCollapsed || mobileOpen) && <span>Sign Out</span>}
            </button>

            {/* Desktop Collapse Toggle */}
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              className="hidden md:grid h-8 w-8 place-items-center rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors"
            >
              {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Workspace */}
      <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
        {/* Global Staff Top Header */}
        <header className="hidden md:flex items-center justify-between px-8 py-4 border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-950/80 backdrop-blur-md sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <span className="font-display font-semibold text-gray-900 dark:text-white text-base">
              Front-Office Operations Center
            </span>
            <span className="text-xs px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 font-mono border border-emerald-200 dark:border-emerald-800">
              Live Connection
            </span>
          </div>

          <div className="flex items-center gap-4">
            <Link
              href="/"
              target="_blank"
              className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
            >
              <span>Public Website</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
            <div className="h-4 w-px bg-gray-200 dark:bg-gray-800" />
            <span className="text-xs font-mono text-gray-500 dark:text-gray-400">
              {new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
            </span>
          </div>
        </header>

        {/* Dynamic Route Content */}
        <main className="flex-1 p-4 sm:p-6 md:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
