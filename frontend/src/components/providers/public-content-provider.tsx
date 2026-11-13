'use client';

import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import {
  Announcement,
  batchTranslate,
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
    startingFee: '',
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

export interface PublicContentProviderProps {
  children: React.ReactNode;
  initialContent?: SiteContent | null;
  initialOrganization?: Organization | null;
  initialAnnouncements?: Announcement[] | null;
  initialTeam?: TeamMember[] | null;
  initialLocations?: LocationItem[] | null;
  initialError?: boolean;
}

export function PublicContentProvider({
  children,
  initialContent,
  initialOrganization,
  initialAnnouncements,
  initialTeam,
  initialLocations,
  initialError = false,
}: PublicContentProviderProps) {
  const [status, setStatus] = useState<PublicContentStatus>(
    initialError ? 'unavailable' : initialContent ? 'ready' : 'loading'
  );
  const [content, setContent] = useState<SiteContent>(initialContent || EMPTY_SITE_CONTENT);
  const [organization, setOrganization] = useState<Organization | null>(initialOrganization || null);
  const [announcements, setAnnouncements] = useState<Announcement[]>(initialAnnouncements || []);
  const [locations, setLocations] = useState<LocationItem[]>(initialLocations || []);
  const [workingHours, setWorkingHours] = useState<WorkingHoursItem[]>([]);
  const [team, setTeam] = useState<TeamMember[]>(initialTeam || []);
  const [locale, setLocaleState] = useState<SupportedLocale>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('marlow_locale_preference') || localStorage.getItem('dhdc_locale');
        if (saved === 'ur' || saved === 'en') return saved;
      } catch {}
    }
    return 'en';
  });

  const rawContentRef = useRef<SiteContent>(initialContent || EMPTY_SITE_CONTENT);
  const rawTeamRef = useRef<TeamMember[]>(initialTeam || []);
  const rawLocationsRef = useRef<LocationItem[]>(initialLocations || []);
  const rawAnnouncementsRef = useRef<Announcement[]>(initialAnnouncements || []);

  const translatePayload = async (
    targetLocale: SupportedLocale,
    rawC: SiteContent,
    rawT: TeamMember[],
    rawL: LocationItem[],
    rawA: Announcement[]
  ) => {
    if (targetLocale !== 'ur') {
      setContent(rawC);
      setTeam(rawT);
      setLocations(rawL);
      setAnnouncements(rawA);
      return;
    }

    const texts: string[] = [];
    rawT.forEach((m) => {
      if (m.displayName) texts.push(m.displayName);
      if (m.role) texts.push(m.role);
      if (m.professionalTitle) texts.push(m.professionalTitle);
      if (m.biography) texts.push(m.biography);
      if (m.credentials) texts.push(m.credentials);
      if (Array.isArray(m.specialties)) {
        m.specialties.forEach((s) => texts.push(s));
      }
    });
    rawL.forEach((l) => {
      if (l.name) texts.push(l.name);
      if (l.city) texts.push(l.city);
      if (l.addressLine1) texts.push(l.addressLine1);
      if (l.addressLine2) texts.push(l.addressLine2);
    });
    rawA.forEach((a) => {
      if (a.content) texts.push(a.content);
    });

    if (rawC.homepage) {
      const hp = rawC.homepage as any;
      if (rawC.homepage.heroEyebrow) texts.push(rawC.homepage.heroEyebrow);
      if (rawC.homepage.heroHeading) texts.push(rawC.homepage.heroHeading);
      if (hp.headline) texts.push(hp.headline);
      if (rawC.homepage.heroDescription) texts.push(rawC.homepage.heroDescription);
      if (hp.subheadline) texts.push(hp.subheadline);
      if (rawC.homepage.heroCtaText) texts.push(rawC.homepage.heroCtaText);
      if (rawC.homepage.heroSecondaryCtaText) texts.push(rawC.homepage.heroSecondaryCtaText);
      if (hp.whyChooseUsCaption) texts.push(hp.whyChooseUsCaption);
      if (Array.isArray(rawC.homepage.promises)) {
        rawC.homepage.promises.forEach((p) => {
          if (p.title) texts.push(p.title);
          if (p.subtitle) texts.push(p.subtitle);
          if (p.description) texts.push(p.description);
        });
      }
      if (Array.isArray(rawC.homepage.heroBadges)) {
        rawC.homepage.heroBadges.forEach((b) => texts.push(b));
      }
    }
    const heroAny = (rawC as any).hero;
    if (heroAny) {
      if (heroAny.heroEyebrow) texts.push(heroAny.heroEyebrow);
      if (heroAny.heroHeading) texts.push(heroAny.heroHeading);
      if (heroAny.headline) texts.push(heroAny.headline);
      if (heroAny.heroDescription) texts.push(heroAny.heroDescription);
      if (heroAny.subheadline) texts.push(heroAny.subheadline);
    }
    if (rawC.about) {
      if (rawC.about.eyebrow) texts.push(rawC.about.eyebrow);
      if (rawC.about.title) texts.push(rawC.about.title);
      if (Array.isArray(rawC.about.storyParagraphs)) {
        rawC.about.storyParagraphs.forEach((p) => texts.push(p));
      }
    }
    if (rawC.footer?.tagline) texts.push(rawC.footer.tagline);
    if (rawC.general?.tagline) texts.push(rawC.general.tagline);

    try {
      const trans = await batchTranslate(texts, 'ur');
      if (!trans || Object.keys(trans).length === 0) return;

      setTeam(
        rawT.map((m) => ({
          ...m,
          displayName: trans[m.displayName] || m.displayName,
          role: trans[m.role] || m.role,
          professionalTitle: (m.professionalTitle && trans[m.professionalTitle]) || m.professionalTitle,
          biography: (m.biography && trans[m.biography]) || m.biography,
          credentials: (m.credentials && trans[m.credentials]) || m.credentials,
          specialties: Array.isArray(m.specialties)
            ? m.specialties.map((s) => trans[s] || s)
            : m.specialties,
        }))
      );

      setLocations(
        rawL.map((l) => ({
          ...l,
          name: trans[l.name] || l.name,
          city: (l.city && trans[l.city]) || l.city,
          addressLine1: (l.addressLine1 && trans[l.addressLine1]) || l.addressLine1,
          addressLine2: (l.addressLine2 && trans[l.addressLine2]) || l.addressLine2,
        }))
      );

      setAnnouncements(
        rawA.map((a) => ({
          ...a,
          content: trans[a.content] || a.content,
        }))
      );

      const translatedPromises = Array.isArray(rawC.homepage?.promises)
        ? rawC.homepage.promises.map((p) => ({
            ...p,
            title: (p.title && trans[p.title]) || p.title,
            subtitle: (p.subtitle && trans[p.subtitle]) || p.subtitle,
            description: (p.description && trans[p.description]) || p.description,
          }))
        : [];

      const translatedHeroHeading = (rawC.homepage?.heroHeading && trans[rawC.homepage.heroHeading]) ||
        trans[(rawC.homepage as any)?.headline] || 'اسلام آباد میں عالمی معیار کی جدید ڈینٹسٹری';

      const translatedHeroDesc = (rawC.homepage?.heroDescription && trans[rawC.homepage.heroDescription]) ||
        trans[(rawC.homepage as any)?.subheadline] || 'مریض کے آرام، شفاف فیس اور دیرپا نتائج کے لیے جدید اور کم سے کم جراحی والی دانتوں کی دیکھ بھال کا تجربہ کریں۔';

      const translatedHeroEyebrow = (rawC.homepage?.heroEyebrow && trans[rawC.homepage.heroEyebrow]) || 'مصدقہ طبی معیار اور ہمدردی';

      const translatedBadges = Array.isArray(rawC.homepage?.heroBadges)
        ? rawC.homepage.heroBadges.map((b) => trans[b] || b)
        : ['جراثیم کشی کے پروٹوکولز', 'کم شعاعوں والے ڈیجیٹل ایکسرے', 'درد سے پاک انفیلتریشن'];

      setContent((prev) => ({
        ...prev,
        general: {
          ...prev.general,
          practiceName: 'حرا ڈینٹل کلینک',
          tagline: (rawC.general?.tagline && trans[rawC.general.tagline]) || 'جدید ڈینٹسٹری میں مصدقہ طبی معیار اور ہمدردی',
          address: 'شاپ نمبر 8 اور 9، اسکون ہائٹس، لوئر گراؤنڈ، سوان گارڈن، بلاک سی، اسلام آباد۔',
        },
        homepage: {
          ...prev.homepage,
          heroEyebrow: translatedHeroEyebrow,
          heroHeading: translatedHeroHeading,
          headline: translatedHeroHeading,
          heroDescription: translatedHeroDesc,
          subheadline: translatedHeroDesc,
          heroCtaText: (rawC.homepage?.heroCtaText && trans[rawC.homepage.heroCtaText]) || 'اپائنٹمنٹ بک کریں',
          heroSecondaryCtaText: (rawC.homepage?.heroSecondaryCtaText && trans[rawC.homepage.heroSecondaryCtaText]) || 'کلینک کال کریں',
          whyChooseUsCaption: trans[(rawC.homepage as any)?.whyChooseUsCaption] || 'چیئر سائیڈ ڈیجیٹل ریڈیوگرافی اور ہسپتال کے درجے کے انفیکشن کنٹرول سے لیس جدید ٹریٹمنٹ اسٹیشن۔',
          promises: translatedPromises,
          heroBadges: translatedBadges,
        },
        hero: {
          ...((prev as any).hero || {}),
          heroEyebrow: translatedHeroEyebrow,
          heroHeading: translatedHeroHeading,
          headline: translatedHeroHeading,
          heroDescription: translatedHeroDesc,
          subheadline: translatedHeroDesc,
          heroBadges: translatedBadges,
          heroTicks: translatedBadges.map((b) => ({ label: b })),
          promises: translatedPromises,
        },
        about: {
          ...prev.about,
          eyebrow: (rawC.about?.eyebrow && trans[rawC.about.eyebrow]) || 'ہمارا طبی ورثہ',
          title: (rawC.about?.title && trans[rawC.about.title]) || 'پاکستان میں دانتوں کے علاج کے تجربے کی نئی تعریف',
          storyParagraphs: Array.isArray(rawC.about?.storyParagraphs)
            ? rawC.about.storyParagraphs.map((p) => trans[p] || p)
            : rawC.about?.storyParagraphs || [],
        },
        footer: {
          ...prev.footer,
          tagline: (rawC.footer?.tagline && trans[rawC.footer.tagline]) || 'جدید ڈینٹسٹری میں مصدقہ طبی معیار اور ہمدردی۔',
          copyrightNotice: '© 2026 حرا ڈینٹل کلینک۔ جملہ حقوق محفوظ ہیں۔',
          cancellationPolicy: 'اپائنٹمنٹ کے وقت سے 24 گھنٹے قبل منسوخ کی جانے والی بکنگ بغیر کسی جرمانے کے ری شیڈول کی جاتی ہے۔',
        },
      }));
    } catch {
      // Graceful fallback to raw text
    }
  };

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
        const saved = (localStorage.getItem('marlow_locale_preference') || localStorage.getItem('dhdc_locale')) as SupportedLocale;
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
    translatePayload(
      locale,
      rawContentRef.current,
      rawTeamRef.current,
      rawLocationsRef.current,
      rawAnnouncementsRef.current
    );
  }, [locale]);

  const copy = getUiCopy(locale);

  const loadData = async () => {
    // Only set loading if we don't already have initial content
    if (!initialContent) {
      setStatus('loading');
    }
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
        if (!initialContent) {
          setStatus('unavailable');
          setContent({ ...EMPTY_SITE_CONTENT, status: 'unavailable' });
        }
        return;
      }

      if (contentData) {
        rawContentRef.current = { ...contentData, status: contentData.status || 'ready' };
      } else if (!initialContent) {
        rawContentRef.current = { ...EMPTY_SITE_CONTENT, status: 'ready' };
      }

      if (orgData) setOrganization(orgData);
      if (announcementsData) rawAnnouncementsRef.current = announcementsData;
      if (locationsData) rawLocationsRef.current = locationsData;
      if (teamData) rawTeamRef.current = teamData;
      if (hoursData) setWorkingHours(hoursData);

      setStatus(contentData?.status || 'ready');

      // Apply active locale translation to incoming fresh data
      translatePayload(
        locale,
        rawContentRef.current,
        rawTeamRef.current,
        rawLocationsRef.current,
        rawAnnouncementsRef.current
      );
    } catch {
      if (!initialContent) {
        setStatus('unavailable');
        setContent({ ...EMPTY_SITE_CONTENT, status: 'unavailable' });
      }
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
        const hexToRgb = (hex: string) => {
          const clean = hex.replace('#', '').trim();
          if (clean.length === 3) {
            return `${parseInt(clean[0] + clean[0], 16)}, ${parseInt(clean[1] + clean[1], 16)}, ${parseInt(clean[2] + clean[2], 16)}`;
          }
          if (clean.length === 6) {
            return `${parseInt(clean.slice(0, 2), 16)}, ${parseInt(clean.slice(2, 4), 16)}, ${parseInt(clean.slice(4, 6), 16)}`;
          }
          return null;
        };

        css += ':root:not(.dark) {\n';
        if (primary) {
          const rgb = hexToRgb(primary);
          css += `--color-primary: ${primary}; --primary: ${primary}; --color-forest: ${primary};\n`;
          if (rgb) css += `--color-primary-rgb: ${rgb};\n`;
        }
        if (secondary) css += `--color-secondary: ${secondary}; --color-gold: ${secondary};\n`;
        if (bg) css += `--color-bg-base: ${bg};\n`;
        if (pFont) css += `--font-primary: '${pFont}', Georgia, serif;\n`;
        if (sFont) css += `--font-secondary: '${sFont}', system-ui, sans-serif;\n`;
        css += '}\n';

        css += '.dark {\n';
        if (primary) {
          const rgb = hexToRgb(primary);
          css += `--color-primary: ${primary}; --primary: ${primary};\n`;
          if (rgb) css += `--color-primary-rgb: ${rgb};\n`;
        }
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