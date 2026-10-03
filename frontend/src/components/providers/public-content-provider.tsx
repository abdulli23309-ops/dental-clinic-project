"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import {
  DEFAULT_SITE_CONTENT,
  getLocations,
  getSiteContent,
  getTeamMembers,
  LocationItem,
  SiteContent,
  TeamMember,
} from "@/lib/api";

interface PublicContentContextType {
  content: SiteContent;
  locations: LocationItem[];
  primaryLocation: LocationItem;
  team: TeamMember[];
  director: TeamMember;
  isLoading: boolean;
  refreshPublicContent: () => Promise<void>;
}

const DEFAULT_PRIMARY_LOCATION: LocationItem = {
  id: "loc-chicago-primary",
  organizationId: "marlow-dental-group",
  name: "Lincoln Park Practice Facility",
  addressLine1: "214 Alder Street, Suite 3",
  addressLine2: null,
  city: "Chicago",
  state: "IL",
  postalCode: "60614",
  country: "US",
  phone: "(312) 555-0147",
  email: "care@marlowdental.com",
  hoursInfo: "Mon–Thu: 8:00 AM – 6:00 PM · Fri: 8:00 AM – 2:00 PM · Sat–Sun: Closed",
  isPrimary: true,
  isActive: true,
  displayOrder: 0,
};

const DEFAULT_DIRECTOR: TeamMember = {
  id: "director-primary",
  organizationId: "marlow-dental-group",
  locationId: "loc-chicago-primary",
  firstName: "Sarah",
  lastName: "Marlow",
  displayName: "Dr. Sarah Marlow, DDS",
  professionalTitle: "Founder & Clinical Director",
  role: "Director",
  specialties: ["General Dentistry", "Conservative Restorative Care", "Clear Aligner Therapy"],
  biography:
    "After graduating from the University of Michigan School of Dentistry, Dr. Marlow established this practice dedicated to unhurried, patient-first care with zero unnecessary procedures.",
  photoUrl:
    "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?q=80&w=1200&auto=format&fit=crop",
  education: "Doctor of Dental Surgery (DDS), University of Michigan",
  credentials: "DDS",
  licenseNumber: "#019.029811",
  licenseState: "Illinois",
  displayOrder: 0,
  isActive: true,
};

const PublicContentContext = createContext<PublicContentContextType | undefined>(undefined);

export function PublicContentProvider({ children }: { children: React.ReactNode }) {
  const [content, setContent] = useState<SiteContent>(DEFAULT_SITE_CONTENT);
  const [locations, setLocations] = useState<LocationItem[]>([DEFAULT_PRIMARY_LOCATION]);
  const [team, setTeam] = useState<TeamMember[]>([DEFAULT_DIRECTOR]);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    try {
      const [contentData, locationsData, teamData] = await Promise.all([
        getSiteContent().catch(() => DEFAULT_SITE_CONTENT),
        getLocations().catch(() => [DEFAULT_PRIMARY_LOCATION]),
        getTeamMembers().catch(() => [DEFAULT_DIRECTOR]),
      ]);

      if (contentData) setContent(contentData);
      if (locationsData && locationsData.length > 0) setLocations(locationsData);
      if (teamData && teamData.length > 0) setTeam(teamData);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const primaryLocation =
    locations.find((l) => l.isPrimary && l.isActive) ||
    locations.find((l) => l.isActive) ||
    DEFAULT_PRIMARY_LOCATION;

  const director =
    team.find((m) => m.role === "Director" && m.isActive) ||
    team.find((m) => m.isActive) ||
    DEFAULT_DIRECTOR;

  return (
    <PublicContentContext.Provider
      value={{
        content,
        locations,
        primaryLocation,
        team,
        director,
        isLoading,
        refreshPublicContent: loadData,
      }}
    >
      {children}
    </PublicContentContext.Provider>
  );
}

export function usePublicContent() {
  const context = useContext(PublicContentContext);
  if (!context) {
    throw new Error("usePublicContent must be used within a PublicContentProvider");
  }
  return context;
}
