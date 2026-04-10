"use client";

import { SiteHeader } from "./SiteHeader";
import { HeroSection } from "./HeroSection";
import { HowItWorksSection } from "./HowItWorksSection";
import { ForEmployersSection } from "./ForEmployersSection";
import { TeamsSection } from "./TeamsSection";
import { PositioningBanner } from "./PositioningBanner";
import { SiteFooter } from "./SiteFooter";
import { LandingTheme } from "./LandingTheme";

export function LandingPage() {
  return (
    <LandingTheme>
      <div className="landing-page flex min-h-screen flex-col bg-[#0A0F1E]">
        <SiteHeader />
        <main className="flex-1">
          <HeroSection />
          <HowItWorksSection />
          <ForEmployersSection />
          <TeamsSection />
          <PositioningBanner />
        </main>
        <SiteFooter />
      </div>
    </LandingTheme>
  );
}
