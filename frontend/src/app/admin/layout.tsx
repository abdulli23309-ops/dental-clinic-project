"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ExternalLink,
  Globe,
  Home,
  Layers,
  LogOut,
  MapPin,
  Shield,
  UserCheck,
  Users,
} from "lucide-react";

import { useAuth } from "@/components/providers/auth-provider";
import { ThemeToggle } from "@/components/ui/theme-toggle";

const NAV_ITEMS = [
  { href: "/admin", label: "Overview", icon: Home, exact: true },
  { href: "/admin/website", label: "Website Content", icon: Globe },
  { href: "/admin/team", label: "Team Members", icon: Users },
  { href: "/admin/services", label: "Services & Fees", icon: Layers },
  { href: "/admin/locations", label: "Locations", icon: MapPin },
  { href: "/admin/account", label: "Account", icon: Shield },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoading, logout } = useAuth();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login");
    }
  }, [user, isLoading, router]);

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
    <div className="min-h-screen bg-bone flex flex-col">
      {/* Admin Sticky Navigation Header */}
      <header className="sticky top-0 z-40 border-b border-line/80 bg-cream/90 backdrop-blur-md">
        <div className="container-x py-3 flex items-center justify-between gap-4">
          {/* Practice Branding & Admin Label */}
          <div className="flex items-center gap-3">
            <Link href="/admin" className="flex items-center gap-2.5">
              <span className="font-display text-lg text-ink font-semibold tracking-tight">
                Marlow Dental
              </span>
              <span className="rounded-full bg-forest/10 dark:bg-emerald-950/50 border border-forest/20 px-2.5 py-0.5 text-[10.5px] font-mono uppercase font-bold text-forest dark:text-emerald-400">
                CMS · Admin
              </span>
            </Link>
          </div>

          {/* Right Header Controls: Public site link, User badge, Theme, Logout */}
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/"
              target="_blank"
              className="hidden md:inline-flex items-center gap-1.5 rounded-full border border-line bg-sand/40 px-3 py-1 text-xs text-ink-soft hover:text-ink transition-colors cursor-pointer"
            >
              <span>View Live Website</span>
              <ExternalLink className="h-3 w-3" />
            </Link>

            <div className="hidden sm:flex items-center gap-2 rounded-full border border-line bg-sand/30 px-3 py-1 text-xs">
              <UserCheck className="h-3.5 w-3.5 text-forest dark:text-emerald-400" />
              <span className="font-medium text-ink truncate max-w-[140px]">{user.fullName}</span>
            </div>

            <ThemeToggle />

            <button
              onClick={() => logout()}
              title="Sign out"
              className="inline-flex items-center gap-1 rounded-full border border-line/80 bg-white/50 dark:bg-black/20 p-2 text-ink-soft hover:text-red-700 hover:border-red-300 dark:hover:text-red-400 transition-colors cursor-pointer"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="sr-only">Sign out</span>
            </button>
          </div>
        </div>

        {/* Horizontal Navigation Tabs */}
        <div className="container-x flex items-center gap-1 sm:gap-2 overflow-x-auto py-2 scrollbar-none">
          {NAV_ITEMS.map((item) => {
            const isActive = item.exact
              ? pathname === item.href
              : pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? "bg-forest text-[#FAF7F2] shadow-subtle"
                    : "bg-transparent text-ink-soft hover:text-ink hover:bg-sand/60"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </header>

      {/* Main Admin Workspace Area */}
      <main className="flex-1 container-x py-8 md:py-10">
        {children}
      </main>
    </div>
  );
}
