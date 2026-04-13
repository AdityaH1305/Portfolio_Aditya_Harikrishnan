import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import About from "@/components/About";
import WhatIBuild from "@/components/WhatIBuild";
import ProjectsEnhanced from "@/components/ProjectsEnhanced";
import Contact from "@/components/Contact";
import CursorGlow from "@/components/CursorGlow";
import OrbNavigation from "@/components/OrbNavigation";

export default function Home() {
  return (
    <main className="bg-black text-white min-h-screen animated-bg">
      <CursorGlow />
      <OrbNavigation />
      <Navbar />
      <Hero />
      <About />
      <WhatIBuild />
      <ProjectsEnhanced />
      <Contact />
    </main>
  );
}