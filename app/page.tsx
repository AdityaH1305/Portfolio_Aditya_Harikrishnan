import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import OrbNavigation from "@/components/OrbNavigation";
import About from "@/components/About";
import WhatIBuild from "@/components/WhatIBuild";
import FeaturedProject from "@/components/FeaturedProject";
import ProjectsEnhanced from "@/components/ProjectsEnhanced";
import Contact from "@/components/Contact";
import CursorGlow from "@/components/CursorGlow";

export default function Home() {
  return (
    <main className="bg-black text-white min-h-screen animated-bg">
      <CursorGlow />
      <Navbar />
      <Hero />
      <OrbNavigation />
      <About />
      <WhatIBuild />
      <FeaturedProject />
      <ProjectsEnhanced />
      <Contact />
    </main>
  );
}