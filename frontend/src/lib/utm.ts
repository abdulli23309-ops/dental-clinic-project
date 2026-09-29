/**
 * Utility to extract, store, and preserve UTM tracking parameters
 * across client navigation and booking requests without corrupting URLs.
 */

const UTM_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
] as const;

export type UtmParams = Partial<Record<(typeof UTM_KEYS)[number], string>>;

const STORAGE_KEY = "marlow_utm_params";

/**
 * Reads marketing campaign tracking tags (such as Google ad source) from the current URL.
 * If found, it saves them in temporary browser session storage so they persist across page views.
 */
export function captureUtmParams(): UtmParams {
  if (typeof window === "undefined") return {};

  try {
    const urlParams = new URLSearchParams(window.location.search);
    const captured: UtmParams = {};
    let hasUtm = false;

    for (const key of UTM_KEYS) {
      const val = urlParams.get(key);
      if (val) {
        captured[key] = val;
        hasUtm = true;
      }
    }

    if (hasUtm) {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(captured));
      return captured;
    }

    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // Session storage not available
  }

  return {};
}

/**
 * Retrieves any previously stored marketing tracking tags from browser session storage.
 */
export function getStoredUtmParams(): UtmParams {
  if (typeof window === "undefined") return {};
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

/**
 * Appends any stored marketing tracking tags onto an outgoing web address.
 * This preserves campaign attribution when navigating across the clinic's pages.
 */
export function appendUtmToUrl(url: string): string {
  if (typeof window === "undefined") return url;
  const utms = getStoredUtmParams();
  if (Object.keys(utms).length === 0) return url;

  try {
    const parsed = new URL(url, window.location.origin);
    for (const [key, value] of Object.entries(utms)) {
      if (value && !parsed.searchParams.has(key)) {
        parsed.searchParams.set(key, value);
      }
    }
    return parsed.pathname + parsed.search + parsed.hash;
  } catch {
    return url;
  }
}
