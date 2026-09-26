import type { MetadataRoute } from "next";

/**
 * Generates the robots.txt search engine directive file instructing web crawlers to index the site.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [],
    },
    sitemap: "https://marlowdental.com/sitemap.xml",
  };
}
