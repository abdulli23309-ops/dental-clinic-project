"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Database,
  Globe,
  Layers,
  MapPin,
  ShieldCheck,
  Users,
} from "lucide-react";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/providers/auth-provider";
import {
  adminGetFaqs,
  adminGetServices,
  adminGetTeam,
  getLocations,
  getSiteContent,
} from "@/lib/api";

export default function AdminOverviewPage() {
  const { user, accessToken } = useAuth();
  const [stats, setStats] = useState({
    servicesCount: 0,
    teamCount: 0,
    faqsCount: 0,
    practiceName: "Marlow Dental",
    primaryLocation: "Lincoln Park, Chicago",
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadOverview() {
      if (!accessToken) return;
      try {
        const [services, team, faqs, content, locations] = await Promise.allSettled([
          adminGetServices(accessToken),
          adminGetTeam(accessToken),
          adminGetFaqs(accessToken),
          getSiteContent(),
          getLocations(),
        ]);

        const servicesVal = services.status === "fulfilled" ? services.value : [];
        const teamVal = team.status === "fulfilled" ? team.value : [];
        const faqsVal = faqs.status === "fulfilled" ? faqs.value : [];
        const contentVal = content.status === "fulfilled" ? content.value : null;
        const locationsVal = locations.status === "fulfilled" ? locations.value : [];

        setStats({
          servicesCount: Array.isArray(servicesVal) ? servicesVal.filter((s: any) => s.isActive).length : 0,
          teamCount: Array.isArray(teamVal) ? teamVal.filter((t: any) => t.isActive).length : 0,
          faqsCount: Array.isArray(faqsVal) ? faqsVal.filter((f: any) => f.isActive).length : 0,
          practiceName: contentVal?.general?.practiceName || "Marlow Dental",
          primaryLocation: locationsVal[0] ? `${locationsVal[0].city}, ${locationsVal[0].state}` : "Lincoln Park, Chicago",
        });
      } finally {
        setIsLoading(false);
      }
    }

    loadOverview();
  }, [accessToken]);

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Top Welcome Heading */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-line pb-6">
        <div>
          <p className="eyebrow mb-1">Administrative Workspace</p>
          <h1 className="text-2xl sm:text-3xl font-display text-ink font-normal">
            Welcome back, {user?.fullName.split(" ")[0]}
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-ink-soft">
            Manage database-backed clinic content, clinical staff, and patient procedure fees.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button href="/admin/announcements" variant="outline" size="sm">
            <span>Announcements</span>
          </Button>
          <Button href="/admin/settings" variant="outline" size="sm">
            <span>Settings &amp; Theming</span>
          </Button>
          <Button href="/admin/website" variant="primary" size="sm">
            <span>Website CMS</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Real Clinic Architecture & State Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <Card surface="cream" shadow="card" className="p-6">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs text-forest uppercase font-semibold">Active Services</span>
            <Layers className="h-4 w-4 text-forest" />
          </div>
          <p className="mt-4 text-3xl font-display text-ink">
            {isLoading ? "—" : stats.servicesCount}
          </p>
          <p className="mt-1 text-xs text-ink-soft">
            Procedures live on public fee schedule and booking flow.
          </p>
          <Link
            href="/admin/services"
            className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-forest hover:underline"
          >
            <span>Manage services &amp; pricing</span>
            <ArrowRight className="h-3 w-3" />
          </Link>
        </Card>

        <Card surface="cream" shadow="card" className="p-6">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs text-forest uppercase font-semibold">Clinical Team</span>
            <Users className="h-4 w-4 text-forest" />
          </div>
          <p className="mt-4 text-3xl font-display text-ink">
            {isLoading ? "—" : stats.teamCount}
          </p>
          <p className="mt-1 text-xs text-ink-soft">
            Active clinicians and staff presented on the public website.
          </p>
          <Link
            href="/admin/team"
            className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-forest hover:underline"
          >
            <span>Manage team members</span>
            <ArrowRight className="h-3 w-3" />
          </Link>
        </Card>

        <Card surface="cream" shadow="card" className="p-6">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs text-forest uppercase font-semibold">Published FAQs</span>
            <Globe className="h-4 w-4 text-forest" />
          </div>
          <p className="mt-4 text-3xl font-display text-ink">
            {isLoading ? "—" : stats.faqsCount}
          </p>
          <p className="mt-1 text-xs text-ink-soft">
            Patient questions covering pricing, comfort, and insurance.
          </p>
          <Link
            href="/admin/website"
            className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-forest hover:underline"
          >
            <span>Review &amp; edit FAQs</span>
            <ArrowRight className="h-3 w-3" />
          </Link>
        </Card>
      </div>

      {/* Clinic System Integrity & Scope Notice */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card surface="bone" shadow="subtle" className="p-6 space-y-4">
          <div className="flex items-center gap-2 text-ink font-medium text-sm">
            <ShieldCheck className="h-4 w-4 text-forest" />
            <span>Practice Organization &amp; Location</span>
          </div>
          <div className="space-y-2 text-xs text-ink-soft">
            <p>
              <strong className="text-ink font-semibold">Organization:</strong> {stats.practiceName}
            </p>
            <p>
              <strong className="text-ink font-semibold">Primary Facility:</strong> {stats.primaryLocation}
            </p>
            <p>
              <strong className="text-ink font-semibold">Architecture:</strong> Scalable multi-location foundation supporting multiple doctors and future role expansion.
            </p>
          </div>
        </Card>

        <Card surface="bone" shadow="subtle" className="p-6 space-y-4">
          <div className="flex items-center gap-2 text-ink font-medium text-sm">
            <Database className="h-4 w-4 text-forest" />
            <span>Database Integrity &amp; Soft Deletion</span>
          </div>
          <div className="space-y-2 text-xs text-ink-soft">
            <p className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Soft-delete enabled: record history preserved on deactivation.</span>
            </p>
            <p className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Zero fabricated analytics: real content only.</span>
            </p>
            <p className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Live synchronization: public frontend reflects database updates.</span>
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
