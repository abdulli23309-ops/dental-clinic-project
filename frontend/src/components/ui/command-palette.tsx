"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Users,
  Calendar,
  Settings,
  Shield,
  FileText,
  Clock,
  ExternalLink,
  SunMoon,
  LogOut,
  PlusCircle,
  Activity,
  ArrowRight,
  UserPlus,
  Stethoscope,
} from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { Kbd } from "@/components/ui/kbd";
import { cn } from "@/lib/utils";

export interface CommandItem {
  id: string;
  title: string;
  subtitle?: string;
  category: "Navigation" | "Quick Actions" | "Clinical" | "System";
  icon: React.ReactNode;
  keywords?: string[];
  shortcut?: string;
  onSelect: () => void;
}

export interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
      const timer = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const allCommands: CommandItem[] = useMemo(() => {
    const role = user?.role || "admin";
    const items: CommandItem[] = [
      // Navigation
      {
        id: "nav-admin-dashboard",
        title: "Admin Dashboard",
        subtitle: "Practice overview, KPIs, and quick metrics",
        category: "Navigation",
        icon: <Activity className="w-4 h-4 text-emerald-600" />,
        keywords: ["home", "stats", "overview", "kpi"],
        onSelect: () => router.push("/admin"),
      },
      {
        id: "nav-users",
        title: "User Management & Staff Roles",
        subtitle: "Manage staff accounts, credentials, and permissions",
        category: "Navigation",
        icon: <Users className="w-4 h-4 text-blue-600" />,
        keywords: ["users", "staff", "permissions", "roles", "accounts"],
        onSelect: () => router.push("/admin/users"),
      },
      {
        id: "nav-team",
        title: "Clinical Team & Doctors",
        subtitle: "Configure doctors, specialties, and bio details",
        category: "Navigation",
        icon: <Stethoscope className="w-4 h-4 text-purple-600" />,
        keywords: ["doctors", "clinicians", "team", "specialists"],
        onSelect: () => router.push("/admin/team"),
      },
      {
        id: "nav-appointments",
        title: "Appointments Schedule",
        subtitle: "View clinical bookings, calendar, and daily chair utilization",
        category: "Navigation",
        icon: <Calendar className="w-4 h-4 text-amber-600" />,
        keywords: ["calendar", "schedule", "bookings", "appointments"],
        onSelect: () => router.push("/admin/appointments"),
      },
      {
        id: "nav-reception-patients",
        title: "Patient Registry",
        subtitle: "Search, register, and review patient demographic records",
        category: "Navigation",
        icon: <Users className="w-4 h-4 text-teal-600" />,
        keywords: ["patients", "records", "registry", "charts"],
        onSelect: () => router.push("/reception/patients"),
      },
      {
        id: "nav-cms",
        title: "Website Content Management (CMS)",
        subtitle: "Hero, Why Us, Treatments, FAQs, and Clinic Info",
        category: "Navigation",
        icon: <FileText className="w-4 h-4 text-indigo-600" />,
        keywords: ["cms", "content", "hero", "website", "faqs", "footer"],
        onSelect: () => router.push("/admin/website"),
      },
      {
        id: "nav-audit",
        title: "Security & Audit Logs",
        subtitle: "Inspect immutable system events and staff mutation trails",
        category: "Navigation",
        icon: <Shield className="w-4 h-4 text-rose-600" />,
        keywords: ["audit", "logs", "security", "history", "traces"],
        onSelect: () => router.push("/admin/audit"),
      },
      // Quick Actions
      {
        id: "act-new-appointment",
        title: "Book New Appointment",
        subtitle: "Jump to booking wizard for new patient slot",
        category: "Quick Actions",
        icon: <PlusCircle className="w-4 h-4 text-emerald-600" />,
        keywords: ["book", "create appointment", "slot"],
        shortcut: "N",
        onSelect: () => router.push("/book"),
      },
      {
        id: "act-new-user",
        title: "Create Staff Member",
        subtitle: "Add doctor, receptionist, or administrator",
        category: "Quick Actions",
        icon: <UserPlus className="w-4 h-4 text-blue-600" />,
        keywords: ["add staff", "create user", "new doctor"],
        onSelect: () => router.push("/admin/users"),
      },
      {
        id: "act-view-site",
        title: "Open Live Public Website",
        subtitle: "Preview homepage in new tab",
        category: "Quick Actions",
        icon: <ExternalLink className="w-4 h-4 text-slate-600" />,
        keywords: ["website", "homepage", "live", "preview"],
        onSelect: () => window.open("/", "_blank"),
      },
      {
        id: "act-logout",
        title: "Sign Out",
        subtitle: "End current staff session securely",
        category: "System",
        icon: <LogOut className="w-4 h-4 text-rose-600" />,
        keywords: ["logout", "sign out", "exit"],
        onSelect: () => logout(),
      },
    ];

    return items;
  }, [router, user, logout]);

  const filtered = useMemo(() => {
    if (!query.trim()) return allCommands;
    const q = query.toLowerCase().trim();
    return allCommands.filter((item) => {
      const matchTitle = item.title.toLowerCase().includes(q);
      const matchSubtitle = item.subtitle?.toLowerCase().includes(q);
      const matchCategory = item.category.toLowerCase().includes(q);
      const matchKeywords = item.keywords?.some((k) => k.toLowerCase().includes(q));
      return matchTitle || matchSubtitle || matchCategory || matchKeywords;
    });
  }, [allCommands, query]);

  const handleSelect = useCallback(
    (item: CommandItem) => {
      onClose();
      item.onSelect();
    },
    [onClose]
  );

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) =>
          filtered.length === 0 ? 0 : (prev + 1) % filtered.length
        );
        return;
      }

      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) =>
          filtered.length === 0 ? 0 : (prev - 1 + filtered.length) % filtered.length
        );
        return;
      }

      if (e.key === "Enter" && filtered[selectedIndex]) {
        e.preventDefault();
        handleSelect(filtered[selectedIndex]);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, filtered, selectedIndex, onClose, handleSelect]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col text-slate-900 dark:text-slate-100 animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-4 border-b border-slate-200 dark:border-slate-800">
          <Search className="w-5 h-5 text-slate-400 shrink-0 mr-3" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Type a command, route, or search action..."
            className="w-full py-4 bg-transparent text-sm sm:text-base outline-none text-slate-900 dark:text-white placeholder:text-slate-400"
          />
          <Kbd size="sm" className="hidden sm:inline-flex shrink-0">
            Esc
          </Kbd>
        </div>

        {/* Results List */}
        <div className="max-h-[380px] overflow-y-auto p-2 divide-y divide-slate-100 dark:divide-slate-800/60">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              No matching commands found for &ldquo;{query}&rdquo;
            </div>
          ) : (
            filtered.map((item, index) => {
              const isSelected = selectedIndex === index;
              return (
                <div
                  key={item.id}
                  onClick={() => handleSelect(item)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={cn(
                    "flex items-center justify-between px-3.5 py-3 rounded-2xl cursor-pointer transition-colors text-xs sm:text-sm",
                    isSelected
                      ? "bg-primary/10 dark:bg-primary/20 text-slate-900 dark:text-white"
                      : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60"
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={cn(
                        "w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border",
                        isSelected
                          ? "bg-white dark:bg-slate-800 border-primary/40 shadow-xs"
                          : "bg-slate-100 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/60"
                      )}
                    >
                      {item.icon}
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold truncate">{item.title}</div>
                      {item.subtitle && (
                        <div className="text-[11px] text-slate-400 dark:text-slate-500 truncate">
                          {item.subtitle}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                      {item.category}
                    </span>
                    {isSelected && (
                      <ArrowRight className="w-3.5 h-3.5 text-primary" />
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer shortcuts helper */}
        <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-mono">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <Kbd size="sm">↑</Kbd>
              <Kbd size="sm">↓</Kbd> Navigate
            </span>
            <span className="flex items-center gap-1">
              <Kbd size="sm">↵</Kbd> Open
            </span>
          </div>
          <span>Marlow Clinical Command</span>
        </div>
      </div>
    </div>
  );
}

