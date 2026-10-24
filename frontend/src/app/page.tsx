'use client';

import SiteHeader from '@/components/layout/site-header';
import Hero from '@/components/sections/hero';
import Commitments from '@/components/sections/commitments';
import Services from '@/components/sections/services';
import Doctor from '@/components/sections/doctor';
import Visit from '@/components/sections/visit';
import FAQ from '@/components/sections/faq';
import Footer from '@/components/layout/footer';
import { ScrollProgress } from '@/components/layout/scroll-progress';
import { BackToTop } from '@/components/layout/back-to-top';
import { FloatingAction } from '@/components/layout/floating-action';
import { CookieBanner } from '@/components/ui/cookie-banner';
import { AnimatedPage } from '@/components/ui/animated-page';
import { TemporarilyUnavailable } from '@/components/ui/temporarily-unavailable';
import { usePublicContent } from '@/components/providers/public-content-provider';

export default function Home() {
  const { isUnavailable, retry, status } = usePublicContent();

  return (
    <AnimatedPage>
      <>
        <ScrollProgress />
        <SiteHeader />
        <main id="main-content" className="bg-white dark:bg-gray-950 min-h-[60vh]">
          {isUnavailable ? (
            <TemporarilyUnavailable onRetry={retry} isRetrying={status === 'loading'} />
          ) : (
            <>
              <Hero />
              <Commitments />
              <Services />
              <Doctor />
              <Visit />
              <FAQ />
            </>
          )}
        </main>
        <Footer />
        {!isUnavailable && <BackToTop />}
        {!isUnavailable && <FloatingAction />}
        <CookieBanner />
      </>
    </AnimatedPage>
  );
}