import type { MetadataRoute } from "next";
import { fetchPublicOrganization } from "@/lib/api";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  let org = null;
  try {
    org = await fetchPublicOrganization();
  } catch {
    org = null;
  }

  const name = org?.displayName || org?.name || "Dental Practice";
  const shortName = org?.name || "Dental Practice";
  const description =
    org?.description || "Dental appointment booking and patient care.";
  const bgColor = org?.backgroundColor || "#FFFFFF";
  const themeColor = org?.primaryColor || "#0F766E";

  return {
    name,
    short_name: shortName,
    description,
    start_url: "/",
    display: "standalone",
    background_color: bgColor,
    theme_color: themeColor,
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}
