"use client";

import { LogOut, Shield, ShieldCheck, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/components/providers/auth-provider";

export default function AdminAccountPage() {
  const { user, logout } = useAuth();

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="border-b border-line pb-4">
        <p className="eyebrow mb-1">Administrative Profile</p>
        <h1 className="text-2xl sm:text-3xl font-display text-ink font-normal">
          Staff Account
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-ink-soft">
          Current authenticated session credentials and permission scope.
        </p>
      </div>

      <Card surface="cream" shadow="card" className="p-6 sm:p-8 space-y-6">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-full bg-forest text-[#FAF7F2] grid place-items-center text-xl font-display">
            {user?.fullName
              .split(" ")
              .map((n) => n[0])
              .join("")
              .slice(0, 2)
              .toUpperCase()}
          </div>
          <div>
            <h2 className="text-lg font-display text-ink">{user?.fullName}</h2>
            <p className="text-xs text-ink-soft">{user?.email}</p>
            <div className="mt-1 flex items-center gap-2">
              <span className="rounded-full bg-forest/10 px-2 py-0.5 text-[10px] font-semibold text-forest uppercase">
                Role: {user?.role}
              </span>
              <span className="rounded-full bg-emerald-100 dark:bg-emerald-950 px-2 py-0.5 text-[10px] font-semibold text-emerald-800 dark:text-emerald-300">
                Active Staff
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-3 pt-4 border-t border-line/60 text-xs text-ink-soft">
          <div className="flex justify-between py-1 border-b border-line/40">
            <span>Account Identifier:</span>
            <span className="font-mono text-ink">{user?.id}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-line/40">
            <span>Authorization Scope:</span>
            <span className="font-medium text-ink">Global Administrator (Full Access)</span>
          </div>
          <div className="flex justify-between py-1 border-b border-line/40">
            <span>Authentication Mechanism:</span>
            <span className="text-ink">15-minute JWT Access Token + 7-Day HttpOnly Refresh Rotation</span>
          </div>
        </div>

        <div className="pt-4 border-t border-line/60 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-ink-soft">
            <ShieldCheck className="h-4 w-4 text-forest" />
            <span>End-to-end encrypted session</span>
          </div>

          <Button onClick={() => logout()} variant="secondary" size="sm">
            <LogOut className="h-3.5 w-3.5 mr-1" />
            <span>Sign out of session</span>
          </Button>
        </div>
      </Card>
    </div>
  );
}
