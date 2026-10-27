'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  Announcement,
  fetchPublicAnnouncements,
  fetchPublicOrganization,
  fetchPublicWorkingHours,
  getLocations,
  getSiteContent,
  getTeamMembers,
  LocationItem,
  Organization,
  SiteContent,
  TeamMember,
  WorkingHoursItem,
} from '@/lib/api';
import { DEFAULT_CURRENCY } from '@/lib/currency';
import { SupportedLocale, getUiCopy, UiCopyDictionary } from '@/content/ui-copy';

export type PublicContentStatus = 'loading' | 'ready' | 'unavailable';

const EMPTY_SITE_CONTENT: SiteContent = {
  status: 'loading',
  general: {
    practiceName: '',
    shortBrandName: '',
    tagline: '',
    logoUrl: null,
    faviconUrl: null,
    phone: '',
    email: '',
    address: '',
    emergencyPhone: null,
  },
  homepage: {
    heroEyebrow: '',
    heroHeading: '',
    heroDescription: '',
    heroCtaText: '',
    heroCtaLink: '',
    heroSecondaryCtaText: '',
    heroSecondaryCtaLink: '',
    heroImageUrl: null,
    heroBadges: [],
    promises: [],
  },
  about: {
    eyebrow: '',
    title: '',
    storyParagraphs: [],
    imageUrl: null,
    licensureText: '',
  },
  contact: {
    phone: '',
    email: '',
    addressLine1: '',
    addressLine2: '',
    transitNote: '',
    hoursSummary: '',
    emergencyNote: '',
  },
  footer: {
    tagline: '',
    copyrightNotice: '',
    cancellationPolicy: '',
  },
  legalPages: {
    privacy: '',
    terms: '',
    accessibility: '',
  },
  seo: {
    siteTitle: '',
    metaDescription: '',
    ogImageUrl: null,
  },
};

interface PublicContentContextType {
  status: PublicContentStatus;
  content: SiteContent;
  organization: Organization | null;
  announcements: Announcement[];
  locations: LocationItem[];
  clinics: LocationItem[];
  primaryLocation: LocationItem | null;
  workingHours: WorkingHoursItem[];
  team: TeamMember[];
  director: TeamMember | null;
  currency: { code: string; symbol: string; timezone: string };
  locale: SupportedLocale;
  setLocale: (locale: SupportedLocale) => void;
  copy: UiCopyDictionary;
  isLoading: boolean;
  isUnavailable: boolean;
  retry: () => Promise<void>;
  refreshPublicContent: () => Promise<void>;
}

const PublicContentContext = createContext<PublicContentContextType | undefined>(undefined);

export function PublicContentProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<PublicContentStatus>('loading');
  const [content, setContent] = useState<SiteContent>(EMPTY_SITE_CONTENT);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [locations, setLocations] = useState<LocationItem[]>([]);
  const [workingHours, setWorkingHours] = useState<WorkingHoursItem[]>([]);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [locale, setLocaleState] = useState<SupportedLocale>('en');

  const setLocale = (newLocale: SupportedLocale) => {
    setLocaleState(newLocale);
    if (typeof document !== 'undefined') {
      document.documentElement.lang = newLocale;
      document.documentElement.dir = newLocale === 'ur' ? 'rtl' : 'ltr';
      try {
        localStorage.setItem('marlow_locale_preference', newLocale);
      } catch {}
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('marlow_locale_preference') as SupportedLocale;
        if (saved && (saved === 'en' || saved === 'ur') && saved !== locale) {
          setLocaleState(saved);
        }
      } catch {}
    }
  }, []);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = locale;
      document.documentElement.dir = locale === 'ur' ? 'rtl' : 'ltr';
    }
  }, [locale]);

  const copy = getUiCopy(locale);

  const loadData = async () => {
    setStatus('loading');
    try {
      const results = await Promise.allSettled([
        getSiteContent(),
        fetchPublicOrganization(),
        fetchPublicAnnouncements(),
        getLocations(),
        getTeamMembers(),
        fetchPublicWorkingHours(),
      ]);

      const [contentRes, orgRes, annRes, locRes, teamRes, hoursRes] = results;

      const contentData = contentRes.status === 'fulfilled' ? contentRes.value : null;
      const orgData = orgRes.status === 'fulfilled' ? orgRes.value : null;
      const announcementsData = annRes.status === 'fulfilled' ? annRes.value : [];
      const locationsData = locRes.status === 'fulfilled' ? locRes.value : [];
      const teamData = teamRes.status === 'fulfilled' ? teamRes.value : [];
      const hoursData = hoursRes.status === 'fulfilled' ? hoursRes.value : [];

      // If backend is unreachable or core endpoints failed
      if (!contentData && !orgData && locationsData.length === 0 && teamData.length === 0) {
        setStatus('unavailable');
        setContent({ ...EMPTY_SITE_CONTENT, status: 'unavailable' });
        return;
      }

      if (contentData) {
        setContent({ ...contentData, status: contentData.status || 'ready' });
      } else {
        setContent({ ...EMPTY_SITE_CONTENT, status: 'ready' });
      }

      if (orgData) setOrganization(orgData);
      if (announcementsData) setAnnouncements(announcementsData);
      if (locationsData) setLocations(locationsData);
      if (teamData) setTeam(teamData);
      if (hoursData) setWorkingHours(hoursData);

      setStatus(contentData?.status || 'ready');
    } catch {
      setStatus('unavailable');
      setContent({ ...EMPTY_SITE_CONTENT, status: 'unavailable' });
    }
  };

  const refreshPublicContent = async () => {
    await loadData();
    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      try {
        const channel = new BroadcastChannel("marlow_content_sync");
        channel.postMessage({ type: "REFRESH_PUBLIC_CONTENT", timestamp: Date.now() });
        channel.close();
      } catch {
        // BroadcastChannel unavailable
      }
    }
  };

  useEffect(() => {
    let mounted = true;

    const runLoad = async () => {
      if (mounted) await loadData();
    };

    runLoad();

    // 1. Re-fetch on window focus
    const handleFocus = () => {
      runLoad();
    };
    window.addEventListener("focus", handleFocus);

    // 2. Re-fetch on visibility change (tab switch back)
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        runLoad();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // 3. Cross-tab synchronization via BroadcastChannel
    let channel: BroadcastChannel | null = null;
    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      try {
        channel = new BroadcastChannel("marlow_content_sync");
        channel.onmessage = (event) => {
          if (event.data?.type === "REFRESH_PUBLIC_CONTENT") {
            runLoad();
          }
        };
      } catch {
        channel = null;
      }
    }

    return () => {
      mounted = false;
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (channel) {
        channel.close();
      }
    };
  }, []);

  // Dynamically inject CSS variables from database Organization theming settings safely
  useEffect(() => {
    if (typeof document !== 'undefined') {
      const org = organization;
      const primary = org?.primaryColor;
      const secondary = org?.secondaryColor;
      const bg = org?.backgroundColor;
      const pFont = org?.primaryFont;
      const sFont = org?.secondaryFont;

      let styleTag = document.getElementById('org-brand-theme') as HTMLStyleElement | null;
      if (!styleTag) {
        styleTag = document.createElement('style');
        styleTag.id = 'org-brand-theme';
        document.head.appendChild(styleTag);
      }

      let css = '';
      if (primary || secondary || bg || pFont || sFont) {
        css += ':root:not(.dark) {\n';
        if (primary) css += `--color-primary: ${primary}; --color-forest: ${primary};\n`;
        if (secondary) css += `--color-secondary: ${secondary}; --color-gold: ${secondary};\n`;
        if (bg) css += `--color-bg-base: ${bg};\n`;
        if (pFont) css += `--font-primary: '${pFont}', Georgia, serif;\n`;
        if (sFont) css += `--font-secondary: '${sFont}', system-ui, sans-serif;\n`;
        css += '}\n';

        css += '.dark {\n';
        if (primary) css += `--color-primary: ${primary};\n`;
        if (secondary) css += `--color-secondary: ${secondary};\n`;
        if (pFont) css += `--font-primary: '${pFont}', Georgia, serif;\n`;
        if (sFont) css += `--font-secondary: '${sFont}', system-ui, sans-serif;\n`;
        css += '}\n';
      }
      styleTag.textContent = css;
    }
  }, [organization]);

  const primaryLocation =
    locations.find((l) => l.isPrimary && l.isActive) ||
    locations.find((l) => l.isActive) ||
    null;

  const director =
    team.find((m) => m.role === 'Director' && m.isActive) ||
    team.find((m) => m.isActive) ||
    null;

  const currency = {
    code: organization?.currencyCode || DEFAULT_CURRENCY.code,
    symbol: organization?.currencySymbol || DEFAULT_CURRENCY.symbol,
    timezone: organization?.timezone || DEFAULT_CURRENCY.timezone,
  };

  return (
    <PublicContentContext.Provider
      value={{
        status,
        content,
        organization,
        announcements,
        locations,
        clinics: locations,
        primaryLocation,
        workingHours,
        team,
        director,
        currency,
        locale,
        setLocale,
        copy,
        isLoading: status === 'loading',
        isUnavailable: status === 'unavailable',
        retry: loadData,
        refreshPublicContent,
      }}
    >
      {children}
    </PublicContentContext.Provider>
  );
}

export function usePublicContent() {
  const context = useContext(PublicContentContext);
  if (!context) {
    throw new Error('usePublicContent must be used within a PublicContentProvider');
  }
  return context;
}