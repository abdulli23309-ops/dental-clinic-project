import React from "react";
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AnnouncementMarquee } from "@/components/ui/announcement-marquee";
import { PublicContentProvider } from "@/components/providers/public-content-provider";
import { Announcement, SiteContent } from "@/lib/api";

const mockContent: SiteContent = {
  status: "ready",
  general: {
    practiceName: "Hira Dental Clinic",
    shortBrandName: "DHDC",
    tagline: "Precision & Compassion",
    logoUrl: null,
    faviconUrl: null,
    phone: "051-6102977",
    email: "care@hiradental.com",
    address: "Islamabad",
    emergencyPhone: null,
  },
  homepage: {
    heroEyebrow: "Precision & Compassion",
    heroHeading: "World-Class Dental Excellence in Islamabad",
    heroDescription: "Experience minimally invasive care.",
    heroCtaText: "Book an Appointment",
    heroCtaLink: "/book",
    heroSecondaryCtaText: "Call",
    heroSecondaryCtaLink: "tel:0516102977",
    heroImageUrl: null,
    startingFee: "Rs. 3,500",
    heroBadges: [],
    promises: [],
  },
  about: { eyebrow: "", title: "", storyParagraphs: [], imageUrl: null, licensureText: "" },
  contact: { phone: "", email: "", addressLine1: "", addressLine2: "", transitNote: "", hoursSummary: "", emergencyNote: "" },
  footer: { tagline: "", copyrightNotice: "", cancellationPolicy: "" },
  legalPages: { privacy: "", terms: "", accessibility: "" },
  seo: { siteTitle: "", metaDescription: "", ogImageUrl: null },
};

describe("AnnouncementMarquee Component", () => {
  beforeEach(() => {
    try {
      sessionStorage.clear();
    } catch {}
  });

  it("renders null when there are no announcements", () => {
    const { container } = render(
      <PublicContentProvider initialContent={mockContent} initialAnnouncements={[]}>
        <AnnouncementMarquee />
      </PublicContentProvider>
    );

    expect(container.firstChild).toBeNull();
  });

  it("renders null when all announcements are inactive", () => {
    const inactiveAnnouncements: Announcement[] = [
      {
        id: "1",
        content: "Closed for renovation",
        isActive: false,
        displayOrder: 1,
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
      },
    ];

    const { container } = render(
      <PublicContentProvider initialContent={mockContent} initialAnnouncements={inactiveAnnouncements}>
        <AnnouncementMarquee />
      </PublicContentProvider>
    );

    expect(container.firstChild).toBeNull();
  });

  it("renders active announcements in a permanent continuous dual-track marquee without dismiss button", () => {
    const announcements: Announcement[] = [
      {
        id: "a1",
        content: "New Evening Clinic Hours: 5 PM - 9 PM",
        isActive: true,
        displayOrder: 1,
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
      },
      {
        id: "a2",
        content: "Free Dental Checkups for Children Under 10",
        isActive: true,
        displayOrder: 2,
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
      },
    ];

    render(
      <PublicContentProvider initialContent={mockContent} initialAnnouncements={announcements}>
        <AnnouncementMarquee />
      </PublicContentProvider>
    );

    const region = screen.getByRole("region", { name: /Practice Announcements/i });
    expect(region).toBeInTheDocument();

    const matches = screen.getAllByText("New Evening Clinic Hours: 5 PM - 9 PM");
    expect(matches.length).toBeGreaterThanOrEqual(2);

    // Verify the bar is permanent and does not render a dismiss button
    const dismissButton = screen.queryByRole("button", { name: /Dismiss announcements/i });
    expect(dismissButton).toBeNull();
  });
});
