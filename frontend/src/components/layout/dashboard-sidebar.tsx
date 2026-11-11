"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";

import { useAuth } from "@/components/providers/auth-provider";
import { usePublicContent } from "@/components/providers/public-content-provider";
import { resolveMediaUrl } from "@/lib/api";
import { cn } from "@/lib/utils";

export interface SidebarLink {
  title?: string;
  label?: string;
  href: string;
  icon: LucideIcon;
  exact?: boolean;
  badge?: string | number;
}

export interface DashboardSidebarProps {
  links: SidebarLink[];
  basePath?: string;
  roleLabel?: string;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

/**
 * Shared staff-portal sidebar. Every workspace (Admin, Reception, Doctor)
 * renders this exact floating pill component with rounded-[2.5rem] aesthetic.
 */
export function DashboardSidebar({
  links,
  basePath = "/admin",
  roleLabel = "Organization CMS",
  mobileOpen = false,
  onMobileClose,
}: DashboardSidebarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { organization } = usePublicContent();
  const orgName = organization?.displayName || organization?.name || "Dental Clinic";
  const orgLogo = organization?.logoUrl ? resolveMediaUrl(organization.logoUrl) : null;
  const [logoFailed, setLogoFailed] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  return (
    <aside
      className={cn(
        "m-4 h-[calc(100vh-2rem)] rounded-[2.5rem] shadow-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 flex flex-col transition-all duration-300 ease-in-out overflow-hidden shrink-0 fixed md:sticky top-0 z-50 md:z-30",
        mobileOpen ? "left-0" : "-left-96 md:left-0",
        isCollapsed ? "w-24" : "w-64"
      )}
    >
      {/* Top: Brand Header with Unified Invisible Toggle */}
      <div
        className={cn(
          "p-3.5 border-b border-gray-200 dark:border-gray-800 flex items-center",
          isCollapsed ? "justify-center" : "justify-between"
        )}
      >
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          className={cn(
            "group relative flex items-center gap-3 text-left rounded-xl p-1 transition-all select-none cursor-pointer active:scale-[0.97]",
            isCollapsed ? "justify-center mx-auto" : "w-full min-w-0"
          )}
        >
          {/* Luminous Logo Badge with Integrated Hover Overlay */}
          <div className="relative flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-white dark:bg-white/95 border border-slate-200/80 dark:border-white/90 shadow-sm dark:shadow-[0_0_20px_rgba(255,255,255,0.14)] ring-1 ring-black/5 dark:ring-2 dark:ring-primary/40 p-1.5 shrink-0 transition-transform group-hover:scale-105 overflow-hidden">
            {orgLogo && !logoFailed ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={orgLogo}
                alt={orgName}
                onError={() => setLogoFailed(true)}
                className="w-full h-full object-contain"
              />
            ) : (
              <span className="text-primary font-display font-bold">
                {orgName.charAt(0)}
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

          <div
            className={cn(
              "truncate transition-opacity duration-300 min-w-0 flex-1",
              isCollapsed ? "hidden opacity-0" : "opacity-100 flex flex-col"
            )}
          >
            <span className="font-display text-sm font-bold text-gray-900 dark:text-gray-100 block leading-tight tracking-tight group-hover:text-primary transition-colors truncate">
              {orgName}
            </span>
            <span className="text-[10px] font-mono text-gray-500 dark:text-gray-400 block uppercase tracking-wider truncate">
              {roleLabel}
            </span>
          </div>
        </button>

        {/* Close button on mobile */}
        {onMobileClose && (
          <button
            onClick={onMobileClose}
            className="md:hidden p-1.5 rounded-xl text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer shrink-0 ml-1"
            aria-label="Close sidebar"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Center: Navigation Links */}
      <nav
        className={cn(
          "flex-1 overflow-y-auto p-3 space-y-2 scrollbar-none",
          isCollapsed ? "flex flex-col items-center" : ""
        )}
      >
        {links.map((item) => {
          const itemText = item.title || item.label || "";
          const isActive = item.exact
            ? pathname === item.href
            : pathname === item.href ||
              (item.href !== "/" && pathname.startsWith(`${item.href}/`));
          const Icon = item.icon;

          return (
            <Link
              key={`${item.href}-${itemText}`}
              href={item.href}
              title={itemText}
              className={cn(
                "relative flex items-center rounded-full text-xs font-medium transition-all duration-200 ease-in-out",
                isCollapsed
                  ? "h-12 w-12 justify-center p-0"
                  : "gap-3.5 px-4 py-3 w-full justify-between",
                isActive
                  ? "text-white font-semibold"
                  : "text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800"
              )}
            >
              {isActive && !shouldReduceMotion && (
                <motion.span
                  layoutId="sidebar-active-indicator"
                  className="absolute inset-0 rounded-full bg-primary shadow-md"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
              {isActive && shouldReduceMotion && (
                <span className="absolute inset-0 rounded-full bg-primary shadow-md" />
              )}
              <div className="relative z-10 flex items-center gap-3.5 min-w-0">
                <Icon
                  className={cn(
                    "h-5 w-5 shrink-0 transition-colors",
                    isActive ? "text-white" : "text-primary"
                  )}
                />
                <span
                  className={cn(
                    "truncate transition-opacity duration-300",
                    isCollapsed ? "hidden opacity-0" : "opacity-100 flex"
                  )}
                >
                  {itemText}
                </span>
              </div>
              {!isCollapsed && item.badge !== undefined && (
                <span
                  className={cn(
                    "relative z-10 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold",
                    isActive
                      ? "bg-white/20 text-white"
                      : "bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                  )}
                >
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom: User info & controls */}
      <div className="p-3.5 border-t border-gray-200 dark:border-gray-800 space-y-2 bg-gray-50/60 dark:bg-gray-900/60 rounded-b-[2.5rem]">
        {user && (
          <div
            title={`${user.fullName} (${user.role})`}
            className={cn(
              "flex items-center rounded-2xl bg-white dark:bg-gray-950 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-800 shadow-xs",
              isCollapsed ? "p-1.5 justify-center" : "gap-2.5 p-2.5"
            )}
          >
            <div className="h-9 w-9 shrink-0 rounded-full overflow-hidden bg-primary/10 text-primary flex items-center justify-center text-xs font-bold font-mono border border-gray-200 dark:border-gray-700 shadow-xs">
              {user.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={resolveMediaUrl(user.avatarUrl) || undefined}
                  alt={user.fullName}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span>{user.fullName ? user.fullName.slice(0, 2).toUpperCase() : "MD"}</span>
              )}
            </div>
            <div
              className={cn(
                "truncate flex-1 min-w-0 transition-opacity duration-300",
                isCollapsed ? "hidden opacity-0" : "opacity-100 flex flex-col"
              )}
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
          className={cn(
            "flex items-center",
            isCollapsed ? "flex-col gap-2 pt-1" : "justify-between pt-1"
          )}
        >
          <Link
            href="/"
            target="_blank"
            title="View live website"
            className={cn(
              "transition-opacity duration-300",
              isCollapsed
                ? "hidden opacity-0"
                : "opacity-100 inline-flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white px-3 py-1.5 rounded-full hover:bg-white dark:hover:bg-gray-800 shadow-xs transition-colors"
            )}
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
  );
}

export default DashboardSidebar;
