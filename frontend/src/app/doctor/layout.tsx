"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Activity,
  AlertCircle,
  Calendar,
  LogOut,
  Stethoscope,
  User,
} from "lucide-react";

import { useAuth } from "@/components/providers/auth-provider";
import { ThemeToggle } from "@/components/ui/theme-toggle";

export default function DoctorLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, isLoading, logout } = useAuth();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login");
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-6">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) return null;

  const isAuthorized = user.role === "doctor" || user.role === "admin";

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-6">
        <div className="max-w-md w-full p-8 rounded-2xl bg-white dark:bg-gray-900 border border-red-200 dark:border-red-900 shadow-xl text-center space-y-4">
          <AlertCircle className="h-8 w-8 text-red-600 mx-auto" />
          <h2 className="text-xl font-display font-semibold text-gray-900 dark:text-white">
            Doctor Access Restricted
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            This clinical workspace is reserved for authorized dental practitioners and clinic doctors.
          </p>
          <div className="pt-2 flex justify-center gap-3">
            <button
              onClick={() => logout()}
              className="px-4 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-sm font-medium"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col">
      {/* Top Doctor Navigation Bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between px-6 py-3.5 border-b border-gray-200 dark:border-gray-800 bg-white/90 dark:bg-gray-950/90 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-teal-600 text-white shadow-xs font-display font-bold">
            <Stethoscope className="h-5 w-5" />
          </div>
          <div>
            <span className="font-display font-bold text-gray-900 dark:text-white text-sm block leading-none">
              Marlow Dental
            </span>
            <span className="text-[10px] font-mono uppercase tracking-wider text-teal-600 dark:text-teal-400">
              Practitioner Workspace
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-semibold text-gray-900 dark:text-white">
              {user.fullName || "Dr. Practitioner"}
            </p>
            <p className="text-[10px] font-mono text-teal-600 dark:text-teal-400 capitalize">
              {user.role}
            </p>
          </div>

          <ThemeToggle />

          <button
            onClick={() => logout()}
            title="Sign Out"
            className="p-2 rounded-xl border border-gray-200 dark:border-gray-800 text-gray-500 hover:text-red-600"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-6 max-w-7xl w-full mx-auto">
        {children}
      </main>
    </div>
  );
}
