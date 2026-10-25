import type { Metadata } from "next";
import { Fraunces, Manrope } from "next/font/google";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { AuthProvider } from "@/components/providers/auth-provider";
import { PublicContentProvider } from "@/components/providers/public-content-provider";
import { Toaster } from "sonner";
import { getSiteContent } from "@/lib/api";
import "./globals.css";
import { JsonLd } from "./json-ld";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
  axes: ["opsz", "SOFT", "WONK"],
});

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
});

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

  let content;
  try {
    content = await getSiteContent();
  } catch {
    content = null;
  }

  const metadataBase = siteUrl ? new URL(siteUrl) : undefined;

  // Minimal neutral metadata when no data — no clinic facts
  if (!content) {
    return {
      title: "Dental Clinic",
      ...(metadataBase ? { metadataBase } : {}),
    };
  }

  const seo = content.seo;
  const siteTitle = seo?.siteTitle || "Dental Clinic";
  const metaDescription = seo?.metaDescription || undefined;

  return {
    title: siteTitle,
    description: metaDescription,
    ...(metadataBase ? { metadataBase } : {}),
    manifest: "/manifest.webmanifest",
    openGraph: {
      title: siteTitle,
      description: metaDescription,
      ...(metadataBase ? { url: siteUrl } : {}),
      siteName: seo?.siteTitle || undefined,
      type: "website",
      ...(seo?.ogImageUrl ? { images: [{ url: seo.ogImageUrl }] } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: siteTitle,
      description: metaDescription,
      ...(seo?.ogImageUrl ? { images: [seo.ogImageUrl] } : {}),
    },
  };
}

/**
 * Root layout component that wraps every page of the Marlow Dental website.
 * It configures custom typography fonts and sets up theme support.
 * JSON-LD structured data is rendered by the JsonLd component from API data.
 */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      data-scroll-behavior="smooth"
      className={`${fraunces.variable} ${manrope.variable} font-sans`}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var stored = localStorage.getItem('marlow_theme_preference');
                  var isDark = stored === 'dark' || ((!stored || stored === 'system') && window.matchMedia('(prefers-color-scheme: dark)').matches);
                  if (isDark) {
                    document.documentElement.classList.add('dark');
                    document.documentElement.setAttribute('data-theme', 'dark');
                  } else {
                    document.documentElement.classList.remove('dark');
                    document.documentElement.setAttribute('data-theme', 'light');
                  }
                } catch(e) {}
              })();
            `,
          }}
        />
        <JsonLd />
      </head>
      <body className="grain bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 antialiased">
        <ThemeProvider>
          <AuthProvider>
            <PublicContentProvider>
              {children}
              <Toaster />
            </PublicContentProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
