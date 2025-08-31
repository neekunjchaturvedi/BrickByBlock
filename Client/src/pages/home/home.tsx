import { HeroSection } from "../../components/home/hero";
import FeaturesSection from "../../components/home/features";
import { Footer } from "../../components/home/footer";
import Navbar from "../../components/home/navbar";

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
