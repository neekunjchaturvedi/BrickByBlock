import { Navbar } from "../../components/home/navbar";
import { HeroSection } from "../../components/home/hero";
import FeaturesSection from "../../components/home/features";
import { Footer } from "../../components/home/footer";

export default function Home() {
  return (
    <>
      <Navbar />
      <HeroSection />
      <FeaturesSection />
      <Footer />
    </>
  );
}
