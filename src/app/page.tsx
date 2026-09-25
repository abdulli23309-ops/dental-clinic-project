import SiteHeader from "@/components/site-header";
import Hero from "@/components/hero";
import ThreeThings from "@/components/three-things";
import Services from "@/components/services";
import About from "@/components/about";
import Reviews from "@/components/reviews";
import Visit from "@/components/visit";
import FAQ from "@/components/faq";
import Footer from "@/components/footer";

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main>
        <Hero />
        <ThreeThings />
        <Services />
        <About />
        <Reviews />
        <Visit />
        <FAQ />
      </main>
      <Footer />
    </>
  );
}