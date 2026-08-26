import { Hero } from "@/components/landing/hero";
import { Vision } from "@/components/landing/vision";
import { Innovations } from "@/components/landing/innovations";
import { Demo } from "@/components/landing/demo";
import { How } from "@/components/landing/how";
import { Applications } from "@/components/landing/applications";
import { CTA } from "@/components/landing/cta";
import { Footer } from "@/components/landing/footer";

export default function LandingPage() {
  return (
    <>
      <Hero />
      <Vision />
      <Innovations />
      <Demo />
      <How />
      <Applications />
      <CTA />
      <Footer />
    </>
  );
}
