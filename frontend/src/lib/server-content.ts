import { SiteContent, Organization } from "@/lib/api";

export interface ServerSiteContentResult {
  content: SiteContent | null;
  organization?: Organization | null;
  error: boolean;
}

/**
 * Fetches public site content and organization metadata server-side
 * with next cache tagging and a strict 3-second abort timeout.
 * Never returns hardcoded clinic content.
 */
export async function getServerSiteContent(): Promise<ServerSiteContentResult> {
  const baseUrl =
    process.env.BACKEND_API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "http://127.0.0.1:8000";

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 3000);

  try {
    const probeRes = await fetch(`${baseUrl}/api/v1/health`, {
      cache: "no-store",
      signal: controller.signal,
    });
    if (!probeRes.ok) {
      clearTimeout(timeoutId);
      return { content: null, organization: null, error: true };
    }

    const [contentRes, orgRes] = await Promise.all([
      fetch(`${baseUrl}/api/v1/public/content`, {
        cache: "force-cache",
        next: { revalidate: 60, tags: ["public-content"] },
        signal: controller.signal,
      }),
      fetch(`${baseUrl}/api/v1/public/organization`, {
        cache: "force-cache",
        next: { revalidate: 60, tags: ["public-content"] },
        signal: controller.signal,
      }),
    ]);

    clearTimeout(timeoutId);

    if (!contentRes.ok) {
      return { content: null, organization: null, error: true };
    }

    const contentData = await contentRes.json();
    const orgData = orgRes.ok ? await orgRes.json() : null;

    if (!contentData) {
      return { content: null, organization: null, error: true };
    }

    return {
      content: { ...contentData, status: "ready" },
      organization: orgData,
      error: false,
    };
  } catch {
    clearTimeout(timeoutId);
    return { content: null, organization: null, error: true };
  }
}
