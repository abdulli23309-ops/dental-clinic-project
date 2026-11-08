"use client";

import React, { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ShieldAlert, Home } from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { homePathForRole } from "@/lib/workspace";
import { Button } from "@/components/ui/button";

function UnauthorizedContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const attemptedPath = searchParams.get("attempted") || "the requested section";
  const userRole = user?.role || "Staff";
  const safeHome = homePathForRole(user?.role) || "/login";

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-8 shadow-xl text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:rose-900/60 flex items-center justify-center mx-auto text-rose-600 dark:text-rose-400">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <span className="inline-block px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300">
            403 — Access Forbidden
          </span>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">
            Permission Denied
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            Your role (<strong className="text-slate-900 dark:text-slate-200 capitalize">{userRole}</strong>) does not have authorization to view <code className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-xs font-mono text-slate-800 dark:text-slate-200">{attemptedPath}</code>.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
          Role-Based Access Control (RBAC) enforces strict separation of clinical, front-office, administrative, and facility records. Your session remains securely active.
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link href={safeHome} className="w-full sm:w-auto">
            <Button className="w-full gap-2 rounded-xl font-semibold">
              <Home className="w-4 h-4" />
              Return to My Workspace
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function StandaloneUnauthorizedPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      }
    >
      <UnauthorizedContent />
    </Suspense>
  );
}

