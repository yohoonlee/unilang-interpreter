import { Header } from "@/components/header"
import { HeroSection } from "@/components/hero-section"
import { PlatformSection } from "@/components/platform-section"
import { FeaturesSection } from "@/components/features-section"
import { HowItWorksSection } from "@/components/how-it-works-section"
import { DemoSection } from "@/components/demo-section"
import { PricingSection } from "@/components/pricing-section"
import { Footer } from "@/components/footer"
import { AnimatedBackground } from "@/components/animated-background"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background relative">
      <AnimatedBackground />
      <Header />
      <main>
        <HeroSection />
        <PlatformSection />
        <FeaturesSection />
        <HowItWorksSection />
        <DemoSection />
        <PricingSection />
      </main>
      <Footer />
    </div>
  )
}
