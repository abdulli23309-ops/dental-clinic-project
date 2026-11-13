"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AnimatedPage } from "@/components/ui/animated-page";
import {
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  X,
} from "lucide-react";

import { useAuth } from "@/components/providers/auth-provider";
import { usePublicContent } from "@/components/providers/public-content-provider";
import { useClinicBranding } from "@/components/ui/clinic-logo";
import { resolveMediaUrl } from "@/lib/api";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { CommandPalette } from "@/components/ui/command-palette";
import { OnboardingWizardModal } from "@/components/modals/onboarding-wizard-modal";
import { Kbd } from "@/components/ui/kbd";
import { useKeyboardShortcut } from "@/hooks/use-keyboard-shortcut";
import {
  canAccessWorkspace,
  homePathForRole,
  WorkspaceKey,
} from "@/lib/workspace";

export interface SidebarLink {
  title: string;
  href: string;
  icon: React.ReactNode | React.ComponentType<{ className?: string }>;
  badge?: string | number;
  exact?: boolean;
}

export interface SharedDashboardLayoutProps {
  children: React.ReactNode;
  links: SidebarLink[];
  roleTitle: string;
  portalTitle?: string;
  badgeLabel?: string;
  basePath?: string;
}

function renderIcon(
  icon: React.ReactNode | React.ComponentType<{ className?: string }>,
  isActive: boolean
) {
  if (React.isValidElement(icon)) {
    return icon;
  }
  if (typeof icon === "function" || (typeof icon === "object" && icon !== null)) {
    const IconComp = icon as React.ComponentType<{ className?: string }>;
    return (
      <IconComp
        className={`h-5 w-5 shrink-0 transition-colors ${isActive ? "text-white" : "text-primary"
          }`}
      />
    );
  }
  return null;
}

/**
 * Universal staff dashboard layout: single source of truth for /admin, /doctor, and /reception.
 * Implements a floating pill-shaped sidebar (rounded-[2.5rem], m-4), frosted-glass top header,
 * dynamic theme integration (bg-primary/text-primary), and strict light/dark mode compliance.
 */
export function SharedDashboardLayout({
  children,
  links,
  roleTitle,
  portalTitle,
  badgeLabel,
  basePath,
}: SharedDashboardLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoading, logout } = useAuth();
  const { logoUrl, fullBrandName, shortBrandName } = useClinicBranding();
  const orgName = fullBrandName;
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  // Hydrate persistent sidebar collapse state from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("marlow_dashboard_sidebar_collapsed");
      if (saved !== null) {
        setIsCollapsed(saved === "true");
      }
    } catch {}
  }, []);

  const handleToggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("marlow_dashboard_sidebar_collapsed", String(next));
      } catch {}
      return next;
    });
  };

  // Global hotkey: Cmd/Ctrl + K opens Command Palette
  useKeyboardShortcut("k", () => setIsCommandPaletteOpen((prev) => !prev), {
    ctrl: true,
    meta: true,
    ignoreInputs: true,
  });

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        router.push("/login");
        return;
      }
      const currentWorkspace = basePath
        ? (basePath.replace(/^\//, "").split("/")[0] as WorkspaceKey)
        : null;
      if (currentWorkspace && !canAccessWorkspace(user.role, currentWorkspace)) {
        const fallback = homePathForRole(user.role) || "/unauthorized";
        router.push(fallback);
      }
    }
  }, [user, isLoading, router, basePath]);

  // Close mobile drawer on route transition
  useEffect(() => {
    queueMicrotask(() => {
      setMobileOpen(false);
    });
  }, [pathname]);

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

  const currentWorkspace = basePath
    ? (basePath.replace(/^\//, "").split("/")[0] as WorkspaceKey)
    : null;
  if (currentWorkspace && !canAccessWorkspace(user.role, currentWorkspace)) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 flex flex-col md:flex-row">
      {/* Mobile Top App Bar */}
      <div className="md:hidden sticky top-0 z-40 flex items-center justify-between border-b border-gray-200 dark:border-gray-800 bg-white/95 dark:bg-gray-950/95 px-4 py-3 backdrop-blur-md">
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            onClick={() => setMobileOpen(true)}
            className="p-1.5 rounded-xl border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer shrink-0"
            aria-label="Open navigation sidebar"
          >
            <Menu className="h-5 w-5" />
          </button>
          {pathname !== (basePath || "/admin") && (
            <button
              type="button"
              onClick={() => router.back()}
              className="p-1.5 rounded-xl border border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 hover:text-primary transition-colors cursor-pointer shrink-0"
              aria-label="Go back"
              title="Go back"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
          )}
          {logoUrl && (
            <div className="h-7 w-7 rounded-lg overflow-hidden bg-white dark:bg-white/95 dark:ring-1 dark:ring-primary/40 p-0.5 border border-gray-200 dark:border-white/20 shrink-0 flex items-center justify-center shadow-xs">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={logoUrl} alt="" className="h-full w-full object-contain" />
            </div>
          )}
          <span className="font-display font-semibold text-gray-900 dark:text-gray-100 text-sm tracking-tight truncate max-w-[150px] xs:max-w-none">
            {shortBrandName}
          </span>
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-mono uppercase font-bold text-primary shrink-0">
            {badgeLabel || roleTitle}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setIsCommandPaletteOpen(true)}
            title="Command Palette (Cmd+K)"
            className="p-1.5 rounded-xl border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
            aria-label="Open Command Palette"
          >
            <Search className="h-4 w-4" />
          </button>
          <ThemeToggle />
          <button
            onClick={() => logout()}
            title="Sign out"
            className="p-1.5 rounded-full border border-gray-200 dark:border-gray-800 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors cursor-pointer"
            aria-label="Sign out"
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
        className={`m-4 h-[calc(100vh-2rem)] rounded-[2.5rem] shadow-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 flex flex-col transition-all duration-300 ease-in-out overflow-hidden shrink-0 fixed md:sticky top-0 z-50 md:z-30 ${mobileOpen ? "left-0" : "-left-96 md:left-0"
          } ${isCollapsed ? "w-24" : "w-64"}`}
      >
        {/* Top: Brand Header */}
        <div
          className={`p-3.5 border-b border-gray-200 dark:border-gray-800 flex items-center ${
            isCollapsed ? "justify-center" : "justify-between"
          }`}
        >
          {/* Unified Interactive Brand Header / Logo Button with Integrated Invisible Toggle */}
          <button
            type="button"
            onClick={handleToggleCollapse}
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            className={`group relative flex items-center gap-3 text-left rounded-xl p-1 transition-all select-none cursor-pointer active:scale-[0.97] ${
              isCollapsed ? "justify-center mx-auto" : "w-full min-w-0"
            }`}
          >
            {/* Luminous Logo Badge with Integrated Hover Feedback */}
            <div className="relative h-11 w-11 rounded-2xl bg-white dark:bg-white/95 dark:ring-2 dark:ring-primary/40 dark:shadow-[0_0_20px_rgba(255,255,255,0.12)] border border-gray-200 dark:border-white/20 p-1 flex items-center justify-center shadow-xs overflow-hidden shrink-0 transition-transform group-hover:scale-105">
              {logoUrl && !logoError ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={logoUrl}
                  alt={fullBrandName}
                  className="h-full w-full object-contain"
                  onError={() => setLogoError(true)}
                />
              ) : (
                <span className="font-display font-bold text-lg text-primary">
                  {shortBrandName.charAt(0)}
                </span>
              )}

              {/* Subtle Integrated Hover Feedback (Inside the Logo Badge Only) */}
              <div
                className="opacity-0 group-hover:opacity-100 transition-opacity duration-180 ease-out bg-primary/90 text-white rounded-2xl absolute inset-0 flex items-center justify-center backdrop-blur-sm"
                aria-hidden="true"
              >
                {isCollapsed ? (
                  <PanelLeftOpen className="w-4 h-4" />
                ) : (
                  <PanelLeftClose className="w-4 h-4" />
                )}
              </div>
            </div>

            {/* Brand Title (Visible when expanded) */}
            <div
              className={`truncate transition-opacity duration-300 min-w-0 flex-1 ${
                isCollapsed ? "hidden opacity-0" : "opacity-100 flex flex-col"
              }`}
            >
              <span className="font-display text-sm font-bold text-gray-900 dark:text-gray-100 block leading-tight tracking-tight group-hover:text-primary transition-colors truncate">
                {shortBrandName}
              </span>
              <span className="text-[10px] font-mono text-gray-500 dark:text-gray-400 block uppercase tracking-wider truncate">
                {roleTitle}
              </span>
            </div>
          </button>

          {/* Close button on mobile */}
          <button
            onClick={() => setMobileOpen(false)}
            className="md:hidden p-1.5 rounded-xl text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer shrink-0 ml-1"
            aria-label="Close sidebar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Center: Navigation Links */}
        <nav
          className={`flex-1 overflow-y-auto p-3 space-y-2 scrollbar-none ${isCollapsed ? "flex flex-col items-center" : ""
            }`}
        >
          {links.map((item) => {
            const title = item.title;
            const normalizedPath = pathname.replace(/^\/(cleaner|receptionist|doctor|nurse)/, "/admin");
            const normalizedHref = item.href.replace(/^\/(cleaner|receptionist|doctor|nurse)/, "/admin");
            const isActive = item.exact
              ? pathname === item.href || normalizedPath === normalizedHref
              : pathname === item.href ||
              normalizedPath === normalizedHref ||
              (item.href !== "/" && pathname.startsWith(`${item.href}/`)) ||
              (normalizedHref !== "/admin" && normalizedPath.startsWith(`${normalizedHref}/`));

            return (
              <Link
                key={item.href}
                href={item.href}
                title={title}
                className={`relative flex items-center rounded-full text-xs font-medium transition-all duration-200 ease-in-out ${isCollapsed
                    ? "h-12 w-12 justify-center p-0"
                    : "gap-3.5 px-4 py-3 w-full justify-between"
                  } ${isActive
                    ? "text-white font-semibold"
                    : "text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800"
                  }`}
              >
                {isActive && !shouldReduceMotion && (
                  <motion.span
                    layoutId="shared-sidebar-active-indicator"
                    className="absolute inset-0 rounded-full bg-primary shadow-md"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                {isActive && shouldReduceMotion && (
                  <span className="absolute inset-0 rounded-full bg-primary shadow-md" />
                )}
                <div className="relative z-10 flex items-center gap-3.5 min-w-0">
                  {renderIcon(item.icon, isActive)}
                  <span
                    className={`truncate transition-opacity duration-300 ${isCollapsed ? "hidden opacity-0" : "opacity-100 flex"
                      }`}
                  >
                    {title}
                  </span>
                </div>
                {!isCollapsed && item.badge !== undefined && (
                  <span
                    className={`relative z-10 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${isActive
                        ? "bg-white/20 text-white"
                        : "bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                      }`}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Bottom: User Info & Controls */}
        <div className="p-3.5 border-t border-gray-200 dark:border-gray-800 space-y-2 bg-gray-50/60 dark:bg-gray-900/60 rounded-b-[2.5rem]">
          {user && (
            <div
              title={`${user.fullName} (${user.role})`}
              className={`flex items-center rounded-2xl bg-white dark:bg-gray-950 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-800 shadow-xs ${isCollapsed ? "p-1.5 justify-center" : "gap-2.5 p-2.5"
                }`}
            >
              <div className="h-9 w-9 shrink-0 rounded-full overflow-hidden bg-primary/10 text-primary flex items-center justify-center text-xs font-bold font-mono border border-gray-200 dark:border-gray-700 shadow-xs">
                {user.avatarUrl && !avatarError ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={resolveMediaUrl(user.avatarUrl) || undefined}
                    alt={user.fullName}
                    className="h-full w-full object-cover"
                    onError={() => setAvatarError(true)}
                  />
                ) : (
                  <span>{user.fullName ? user.fullName.slice(0, 2).toUpperCase() : "HD"}</span>
                )}
              </div>
              <div
                className={`truncate flex-1 min-w-0 transition-opacity duration-300 ${isCollapsed ? "hidden opacity-0" : "opacity-100 flex flex-col"
                  }`}
              >
                <p className="text-xs font-semibold text-gray-900 dark:text-white truncate leading-tight">
                  {user.fullName}
                </p>
                <p className="text-[10px] text-primary truncate uppercase font-mono tracking-wider font-semibold">
                  {user.role}
                </p>
              </div>
            </div>
          )}

          <div
            className={`flex items-center ${isCollapsed ? "flex-col gap-2 pt-1" : "justify-between pt-1"
              }`}
          >
            <Link
              href="/"
              target="_blank"
              title="View live website"
              className={`transition-opacity duration-300 ${isCollapsed
                  ? "hidden opacity-0"
                  : "opacity-100 inline-flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white px-3 py-1.5 rounded-full hover:bg-white dark:hover:bg-gray-800 shadow-xs transition-colors"
                }`}
            >
              <span>Live Site</span>
              <ExternalLink className="h-3 w-3" />
            </Link>

            <button
              onClick={() => logout()}
              title="Sign out"
              className="p-2 rounded-full border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 shadow-xs transition-colors cursor-pointer"
              aria-label="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Workspace */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Desktop Sticky Header */}
        <header className="hidden md:flex sticky top-0 z-20 h-14 items-center justify-between border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 px-8 backdrop-blur-md">
          <div className="flex items-center gap-3">
            {pathname !== (basePath || "/admin") && (
              <button
                type="button"
                onClick={() => router.back()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:text-primary hover:border-primary/40 dark:hover:border-primary/40 shadow-xs transition-all cursor-pointer mr-1"
                title="Go back"
                aria-label="Go back"
              >
                <ChevronLeft className="w-3.5 h-3.5 text-primary" />
                <span>Back</span>
              </button>
            )}
            <span className="text-xs font-mono uppercase tracking-wider text-gray-500 dark:text-gray-400">
              {portalTitle || `${roleTitle} Portal`}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsCommandPaletteOpen(true)}
              className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full border border-gray-200 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-800/80 text-xs text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors cursor-pointer"
              title="Command Palette (Cmd+K)"
            >
              <Search className="w-3.5 h-3.5 text-primary" />
              <span>Search or jump to...</span>
              <Kbd size="sm">⌘K</Kbd>
            </button>
            <Link
              href="/"
              target="_blank"
              className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 dark:border-gray-700 bg-gray-100/60 dark:bg-gray-800/60 px-3 py-1 text-xs text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              <span>View Live Website</span>
              <ExternalLink className="h-3 w-3" />
            </Link>
            <ThemeToggle />
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 md:p-8 max-w-7xl mx-auto w-full pb-24 md:pb-8">
          <AnimatePresence mode="wait" key={pathname}>
            <AnimatedPage key={pathname}>
              {children}
            </AnimatedPage>
          </AnimatePresence>
        </main>
      </div>

      {/* Mobile Floating Bottom Glass Navigation Bar (< 768px) */}
      <nav
        aria-label="Staff mobile navigation"
        className="md:hidden fixed bottom-3 inset-x-3 z-40 h-16 rounded-2xl bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl border border-gray-200/80 dark:border-gray-800/80 shadow-2xl px-2 flex items-center justify-around"
      >
        {links.slice(0, 4).map((link) => {
          const isActive = link.exact
            ? pathname === link.href
            : pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex flex-col items-center justify-center gap-1 py-1 px-2 rounded-xl transition-colors min-w-[56px] ${
                isActive
                  ? "text-primary font-semibold"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              <div className="relative">
                {renderIcon(link.icon, isActive)}
                {link.badge !== undefined && (
                  <span className="absolute -top-1 -right-2 px-1 text-[9px] font-bold rounded-full bg-primary text-white">
                    {link.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] tracking-tight leading-none truncate max-w-[64px]">
                {link.title}
              </span>
            </Link>
          );
        })}
        {/* Drawer button for more links */}
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="flex flex-col items-center justify-center gap-1 py-1 px-2 rounded-xl transition-colors min-w-[56px] text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white cursor-pointer"
        >
          <Menu className="h-5 w-5" />
          <span className="text-[10px] tracking-tight leading-none">More</span>
        </button>
      </nav>

      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
      />
      {user &&
        user.role !== "admin" &&
        user.role !== "Platform Owner" &&
        user.role !== "Super Admin" &&
        !user.is_superuser &&
        !user.hasCompletedOnboarding && (
          <OnboardingWizardModal />
        )}
    </div>
  );
}

export default SharedDashboardLayout;

