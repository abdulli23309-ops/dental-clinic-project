import SiteHeader from "@/components/layout/site-header";
import Hero from "@/components/sections/hero";
import Commitments from "@/components/sections/commitments";
import Services from "@/components/sections/services";
import Doctor from "@/components/sections/doctor";
import Visit from "@/components/sections/visit";
import FAQ from "@/components/sections/faq";
import Footer from "@/components/layout/footer";
import { ScrollProgress } from "@/components/layout/scroll-progress";
import { BackToTop } from "@/components/layout/back-to-top";
import { FloatingAction } from "@/components/layout/floating-action";
import { CookieBanner } from "@/components/ui/cookie-banner";

export default function Home() {
  return (
    <>
      <ScrollProgress />
      <SiteHeader />
      <main id="main-content">
        <Hero />
        <Commitments />
        <Services />
        <Doctor />
        <Visit />
        <FAQ />
      </main>
      <Footer />
      <BackToTop />
      <FloatingAction />
      <CookieBanner />
    </>
  );
}