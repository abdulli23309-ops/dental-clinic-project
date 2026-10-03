"use client";

import { useEffect, useState } from "react";
import { Check, Clock, Mail, MapPin, Phone, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { TextField } from "@/components/ui/text-field";
import { useAuth } from "@/components/providers/auth-provider";
import { getLocations, LocationItem } from "@/lib/api";

export default function AdminLocationsPage() {
  const { accessToken } = useAuth();
  const [locations, setLocations] = useState<LocationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await getLocations();
        setLocations(data);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="border-b border-line pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="eyebrow mb-1">Clinic Infrastructure</p>
          <h1 className="text-2xl sm:text-3xl font-display text-ink font-normal">
            Practice Locations
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-ink-soft">
            Multi-location foundation. The Chicago clinic operates as the primary practice facility.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="py-12 flex justify-center items-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-forest border-t-transparent" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {locations.map((loc) => (
            <Card key={loc.id} surface="cream" shadow="card" className="p-6 sm:p-8 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="font-display text-lg text-ink font-semibold">{loc.name}</h3>
                  {loc.isPrimary && (
                    <span className="rounded-full bg-forest text-[#FAF7F2] px-2.5 py-0.5 text-[10.5px] font-semibold uppercase">
                      Primary Clinic
                    </span>
                  )}
                  <span className="rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 text-[10px] font-semibold">
                    Active
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-ink-soft pt-2">
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-forest shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-ink block">Physical Address</strong>
                    <span>{loc.addressLine1}</span>
                    {loc.addressLine2 && <span>, {loc.addressLine2}</span>}
                    <br />
                    <span>
                      {loc.city}, {loc.state} {loc.postalCode}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Phone className="h-3.5 w-3.5 text-forest" />
                    <span>{loc.phone || "(312) 555-0147"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="h-3.5 w-3.5 text-forest" />
                    <span>{loc.email || "care@marlowdental.com"}</span>
                  </div>
                </div>
              </div>

              {loc.hoursInfo && (
                <div className="pt-3 border-t border-line/50 text-xs text-ink-soft">
                  <div className="flex items-start gap-2">
                    <Clock className="h-3.5 w-3.5 text-forest shrink-0 mt-0.5" />
                    <pre className="font-sans whitespace-pre-line text-xs">{loc.hoursInfo}</pre>
                  </div>
                </div>
              )}
            </Card>
          ))}

          <Card surface="bone" shadow="subtle" className="p-6">
            <div className="flex items-center gap-2 text-ink text-sm font-medium mb-1">
              <ShieldCheck className="h-4 w-4 text-forest" />
              <span>Multi-Location Architecture</span>
            </div>
            <p className="text-xs text-ink-soft leading-relaxed">
              The underlying database schema supports multiple practice locations under one organization, allowing future operatory suites, secondary neighborhood offices, or specialist surgical facilities to be attached without schema refactoring.
            </p>
          </Card>
        </div>
      )}
    </div>
  );
}
