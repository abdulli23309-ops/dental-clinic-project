import SiteHeader from '@/components/layout/site-header';
import { AnnouncementMarquee } from '@/components/ui/announcement-marquee';
import Hero from '@/components/sections/hero';
import WhyChooseUs from '@/components/sections/why-choose-us';
import Treatments from '@/components/sections/treatments';
import SuccessStories from '@/components/sections/success-stories';
import OurTeam from '@/components/sections/our-team';
import Gallery from '@/components/sections/gallery';
import LocationsTiming from '@/components/sections/locations-timing';
import FAQ from '@/components/sections/faq';
import BlogsSection from '@/components/sections/blogs-section';
import Footer from '@/components/layout/footer';
import { ScrollProgress } from '@/components/layout/scroll-progress';
import { BackToTop } from '@/components/layout/back-to-top';
import { FloatingAction } from '@/components/layout/floating-action';
import { CookieBanner } from '@/components/ui/cookie-banner';
import { TemporarilyUnavailable } from '@/components/ui/temporarily-unavailable';
import { PublicContentProvider } from '@/components/providers/public-content-provider';
import { getServerSiteContent } from '@/lib/server-content';
import { MobileDock } from '@/components/mobile/MobileDock';
import { MobileBookingProvider } from '@/components/mobile/MobileBookingSheet';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const { content, organization, announcements, team, locations, error } = await getServerSiteContent();

  if (error || !content) {
    return (
      <div className="min-h-screen flex flex-col">
        <main id="main-content" className="bg-white dark:bg-gray-950 min-h-screen flex items-center justify-center p-4">
          <TemporarilyUnavailable />
        </main>
      </div>
    );
  }

  return (
    <PublicContentProvider
      initialContent={content}
      initialOrganization={organization}
      initialAnnouncements={announcements}
      initialTeam={team}
      initialLocations={locations}
    >
      <MobileBookingProvider>
      <div className="min-h-screen flex flex-col">
        <>
          <ScrollProgress />
          <AnnouncementMarquee />
          <SiteHeader />
          <main id="main-content" className="bg-white dark:bg-gray-950 min-h-[60vh] pb-dock md:pb-0">
            {/* 1. Hero: White */}
            <div className="bg-white dark:bg-gray-950">
              <Hero />
            </div>

            {/* 2. Why Choose Us: Warm Ivory */}
            <div className="bg-[#FAF9F5] dark:bg-gray-900/50">
              <WhyChooseUs />
            </div>

            {/* 3. Treatments We Offer: White */}
            <div className="bg-white dark:bg-gray-950">
              <Treatments />
            </div>

            {/* 4. Success Stories: Warm Ivory */}
            <div className="bg-[#FAF9F5] dark:bg-gray-900/50">
              <SuccessStories />
            </div>

            {/* 5. Our Team: White */}
            <div className="bg-white dark:bg-gray-950">
              <OurTeam />
            </div>

            {/* 6. Clinic Gallery: Warm Ivory */}
            <div className="bg-[#FAF9F5] dark:bg-gray-900/50">
              <Gallery />
            </div>

            {/* 7. Our Locations & Timing: White */}
            <div className="bg-white dark:bg-gray-950">
              <LocationsTiming />
            </div>

            {/* 8. FAQs: Warm Ivory */}
            <div className="bg-[#FAF9F5] dark:bg-gray-900/50">
              <FAQ />
            </div>

            {/* 9. Blogs: White */}
            <div className="bg-white dark:bg-gray-950">
              <BlogsSection />
            </div>
          </main>
          {/* 11. Footer with social links */}
          <Footer />
          <div className="max-md:hidden">
            <BackToTop />
            <FloatingAction />
          </div>
          <MobileDock />
          <CookieBanner />
        </>
      </div>
      </MobileBookingProvider>
    </PublicContentProvider>
  );
}