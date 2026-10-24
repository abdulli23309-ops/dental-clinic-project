import { ImageResponse } from "next/og";
import { fetchPublicOrganization, getSiteContent } from "@/lib/api";

export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default async function Image() {
  let org = null;
  let content = null;

  try {
    const [orgData, contentData] = await Promise.all([
      fetchPublicOrganization().catch(() => null),
      getSiteContent().catch(() => null),
    ]);
    org = orgData;
    content = contentData;
  } catch {
    org = null;
    content = null;
  }

  const name =
    org?.displayName ||
    org?.name ||
    content?.seo?.siteTitle ||
    "Dental Clinic";
  const tagline =
    content?.homepage?.heroHeading ||
    org?.tagline ||
    "Professional Dental Care";

  const primaryColor = org?.primaryColor || "#0F766E";
  const bgColor = org?.backgroundColor || "#FAF7F2";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "60px 80px",
          backgroundColor: bgColor,
          border: `16px solid ${primaryColor}`,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "50%",
              backgroundColor: primaryColor,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#FFFFFF",
              fontSize: "24px",
            }}
          >
            ✦
          </div>
          <span
            style={{
              fontSize: "28px",
              letterSpacing: "-0.02em",
              color: "#151613",
            }}
          >
            {name}
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <h1
            style={{
              fontSize: "56px",
              lineHeight: 1.1,
              color: "#151613",
              margin: 0,
              fontWeight: 500,
            }}
          >
            {tagline}
          </h1>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderTop: "2px solid rgba(0,0,0,0.1)",
            paddingTop: "24px",
            fontSize: "18px",
            color: "#4F5047",
          }}
        >
          <span>{name}</span>
          <span style={{ color: primaryColor, fontWeight: 600 }}>
            Online Appointment Reservation
          </span>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
